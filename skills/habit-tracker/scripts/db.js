// scripts/db.js - SQLite database for habit tracker

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'habits.db');

// Issue 14: Add error handling for database initialization
let db;
try {
  db = new Database(DB_PATH);
  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');
} catch (err) {
  console.error('Failed to initialize database:', err.message);
  console.error('Database path:', DB_PATH);
  throw err;
}

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    reminder_hours TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id INTEGER NOT NULL,
    checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    note TEXT,
    FOREIGN KEY (habit_id) REFERENCES habits(id)
  );

  CREATE INDEX IF NOT EXISTS idx_checkins_habit ON checkins(habit_id);
  CREATE INDEX IF NOT EXISTS idx_checkins_date ON checkins(checked_at);
`);

/**
 * Get local date string in the configured timezone
 * IMPORTANT: Requires process.env.TZ to be set before calling
 * @param {number} offsetDays - Days offset from today (negative for past)
 * @returns {string} - Date string in YYYY-MM-DD format
 */
function getLocalDate(offsetDays = 0) {
  const now = new Date();
  if (offsetDays !== 0) {
    now.setDate(now.getDate() + offsetDays);
  }
  // Direct use of Date methods since TZ environment variable is set
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse habit input string "名称::描述::提醒时间"
 * @param {string} text - Input string
 * @returns {object} - Parsed habit object
 */
function parseHabitInput(text) {
  const parts = text.split('::');
  return {
    name: parts[0].trim(),
    description: parts[1] ? parts[1].trim() : '',
    reminderHours: parts[2] ? parts[2].trim() : ''
  };
}

/**
 * Check if current hour is within allowed reminder hours
 * Supports ranges (7-9) and overnight ranges (21-0)
 * @param {number} hour - Current hour (0-23)
 * @param {string} rangeStr - Hour range string (e.g., "7-9" or "7-9,21-23")
 * @returns {boolean} - True if hour is in range
 */
function isHourInRange(hour, rangeStr) {
  if (!rangeStr) return true; // No restriction
  
  const ranges = rangeStr.split(',').map(r => r.trim());
  
  for (const range of ranges) {
    if (range.includes('-')) {
      const [start, end] = range.split('-').map(Number);
      if (end < start) {
        // Overnight range (e.g., 21-0 means 21:00 to 00:00)
        if (hour >= start || hour < end) return true;
      } else {
        // Normal range
        if (hour >= start && hour < end) return true;
      }
    } else {
      // Single hour
      if (hour === parseInt(range)) return true;
    }
  }
  return false;
}

/**
 * Helper to format current time as HH:MM:SS
 * @returns {string} - Time string
 */
function getCurrentTime() {
  const now = new Date();
  return now.getHours().toString().padStart(2, '0') + ':' + 
         now.getMinutes().toString().padStart(2, '0') + ':' + 
         now.getSeconds().toString().padStart(2, '0');
}

const Habits = {
  /**
   * Add a new habit
   * Format: 名称::描述::提醒时间 (e.g., 早餐::吃了什么::7-9)
   * @param {string} text - Habit definition string
   * @returns {object} - Result with id or error
   */
  add(text) {
    const habit = parseHabitInput(text);
    const stmt = db.prepare(
      'INSERT INTO habits (name, description, reminder_hours) VALUES (?, ?, ?)'
    );
    try {
      const result = stmt.run(habit.name, habit.description, habit.reminderHours);
      return { 
        id: result.lastInsertRowid, 
        name: habit.name, 
        description: habit.description,
        reminderHours: habit.reminderHours
      };
    } catch (e) {
      if (e.message.includes('UNIQUE constraint failed')) {
        return { error: `习惯 "${habit.name}" 已存在` };
      }
      throw e;
    }
  },

  /**
   * Get all habits
   * @returns {Array} - List of all habits
   */
  getAll() {
    return db.prepare('SELECT * FROM habits ORDER BY created_at DESC').all();
  },

  /**
   * Get habit by name
   * @param {string} name - Habit name
   * @returns {object|undefined} - Habit object or undefined
   */
  getByName(name) {
    return db.prepare('SELECT * FROM habits WHERE name = ?').get(name);
  },

  /**
   * Get habit by ID
   * @param {number} id - Habit ID
   * @returns {object|undefined} - Habit object or undefined
   */
  getById(id) {
    return db.prepare('SELECT * FROM habits WHERE id = ?').get(id);
  },

  /**
   * Delete habit and its checkins
   * @param {number} id - Habit ID
   * @returns {boolean} - True if deleted
   */
  delete(id) {
    db.prepare('DELETE FROM checkins WHERE habit_id = ?').run(id);
    const result = db.prepare('DELETE FROM habits WHERE id = ?').run(id);
    return result.changes > 0;
  },

  /**
 * Record a check-in for a specific date
 * Uses transaction to prevent race conditions
 * @param {number} habitId - Habit ID
 * @param {string|null} date - Date in YYYY-MM-DD format (default: today)
 * @param {string} note - Optional note
 * @returns {object} - Result with id or error
 */
  checkin(habitId, date = null, note = '') {
    const targetDate = date || getLocalDate();

    // Use transaction for atomic check-and-insert
    const checkinTransaction = db.transaction(() => {
      const existing = db.prepare(
        "SELECT * FROM checkins WHERE habit_id = ? AND date(checked_at) = ?"
      ).get(habitId, targetDate);

      if (existing) {
        return { error: '这天已经打过卡了' };
      }

      const result = db.prepare(
        'INSERT INTO checkins (habit_id, checked_at, note) VALUES (?, ?, ?)'
      ).run(habitId, targetDate + ' ' + getCurrentTime(), note);

      return { id: result.lastInsertRowid, habitId, note };
    });

    return checkinTransaction();
  },

  /**
   * Append a check-in (allows multiple check-ins per day)
   * @param {number} habitId - Habit ID
   * @param {string|null} date - Date in YYYY-MM-DD format (default: today)
   * @param {string} note - Note to append
   * @returns {object} - Result with id and combined note
   */
  appendCheckin(habitId, date = null, note = '') {
    const targetDate = date || getLocalDate();

    const existing = db.prepare(
      "SELECT * FROM checkins WHERE habit_id = ? AND date(checked_at) = ? ORDER BY id DESC LIMIT 1"
    ).get(habitId, targetDate);
    
    let finalNote = note;
    if (existing && existing.note) {
      finalNote = existing.note + ' | ' + note;
    }
    
    const result = db.prepare(
      'INSERT INTO checkins (habit_id, checked_at, note) VALUES (?, ?, ?)'
    ).run(habitId, targetDate + ' ' + getCurrentTime(), finalNote);
    
    return { id: result.lastInsertRowid, habitId, note: finalNote };
  },

  /**
   * Get check-ins for a habit
   * @param {number} habitId - Habit ID
   * @param {number} days - Number of days to look back (default: 30)
   * @returns {Array} - List of check-ins
   */
  getCheckins(habitId, days = 30) {
    const startDate = getLocalDate(-days);
    return db.prepare(`
      SELECT * FROM checkins
      WHERE habit_id = ? AND date(checked_at) >= ?
      ORDER BY checked_at DESC
    `).all(habitId, startDate);
  },

  /**
   * Get today's check-ins with habit info
   * @returns {Array} - List of habits with check-in status
   */
  getTodayCheckins() {
    const localDate = getLocalDate(0);
    return db.prepare(`
      SELECT h.id, h.name, h.reminder_hours, c.id as checkin_id
      FROM habits h
      LEFT JOIN checkins c ON h.id = c.habit_id AND date(c.checked_at) = ?
    `).all(localDate);
  },

  /**
   * Get yesterday's check-ins with habit info
   * @returns {Array} - List of habits with check-in status
   */
  getYesterdayCheckins() {
    const localDate = getLocalDate(-1);
    return db.prepare(`
      SELECT h.id, h.name, c.id as checkin_id
      FROM habits h
      LEFT JOIN checkins c ON h.id = c.habit_id AND date(c.checked_at) = ?
    `).all(localDate);
  },

  /**
   * Calculate streak for a habit (consecutive days)
   * @param {number} habitId - Habit ID
   * @returns {number} - Current streak in days
   */
  getStreak(habitId) {
    const checkins = db.prepare(`
      SELECT DISTINCT date(checked_at) as check_date
      FROM checkins
      WHERE habit_id = ?
      ORDER BY checked_at DESC
    `).all(habitId);

    if (checkins.length === 0) return 0;

    // Use getLocalDate() for consistent timezone handling
    const todayStr = getLocalDate();
    const [ty, tm, td] = todayStr.split('-').map(Number);
    let currentDate = new Date(ty, tm - 1, td);
    currentDate.setHours(0, 0, 0, 0);

    let streak = 0;

    for (const checkin of checkins) {
      const [cy, cm, cd] = checkin.check_date.split('-').map(Number);
      const checkDate = new Date(cy, cm - 1, cd);
      checkDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((currentDate - checkDate) / (1000 * 60 * 60 * 24));

      if (diffDays <= 1) {
        streak++;
        currentDate = checkDate;
      } else {
        break;
      }
    }

    return streak;
  },

  /**
   * Get habits due for reminder based on current time
   * Filters out already checked-in habits and checks time window
   * @returns {Array} - List of habits due for reminder
   */
  getDueHabits() {
    const now = new Date();
    const hour = now.getHours();
    
    const allHabits = this.getAll();
    const todayCheckins = this.getTodayCheckins();
    
    const checkedToday = new Set(todayCheckins.filter(c => c.checkin_id).map(c => c.id));
    
    return allHabits.filter(h => {
      // Skip if already checked in today
      if (checkedToday.has(h.id)) return false;
      
      // Check time window
      return isHourInRange(hour, h.reminder_hours);
    });
  },

  /**
   * Update the latest check-in note for a habit
   * @param {number} habitId - Habit ID
   * @param {string} newNote - New note content
   * @param {string|null} date - Date in YYYY-MM-DD format (default: today)
   * @returns {object} - Result with success status
   */
  updateLatestCheckin(habitId, newNote, date = null) {
    const targetDate = date || getLocalDate();

    const existing = db.prepare(`
      SELECT * FROM checkins
      WHERE habit_id = ? AND date(checked_at) = ?
      ORDER BY id DESC LIMIT 1
    `).get(habitId, targetDate);
    
    if (!existing) {
      return { error: '今天还没有打卡记录' };
    }
    
    db.prepare('UPDATE checkins SET note = ? WHERE id = ?').run(newNote, existing.id);
    
    return { 
      success: true, 
      id: existing.id, 
      habitId, 
      oldNote: existing.note,
      newNote: newNote
    };
  },

  /**
   * Get the latest check-in for a habit
   * @param {number} habitId - Habit ID
   * @param {string|null} date - Date in YYYY-MM-DD format (default: today)
   * @returns {object|undefined} - Latest check-in or undefined
   */
  getLatestCheckin(habitId, date = null) {
    const targetDate = date || getLocalDate();
    return db.prepare(`
      SELECT * FROM checkins
      WHERE habit_id = ? AND date(checked_at) = ?
      ORDER BY id DESC LIMIT 1
    `).get(habitId, targetDate);
  }
};

module.exports = { db, Habits, isHourInRange, getLocalDate, getCurrentTime };
