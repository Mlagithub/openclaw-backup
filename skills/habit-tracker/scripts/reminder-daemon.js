/**
 * Habit Reminder Daemon
 * 定时检查未打卡的习惯，发送 Telegram 提醒
 * 
 * 运行方式: node scripts/reminder-daemon.js
 * 或使用 crontab 添加定时任务
 */

const Database = require('better-sqlite3');
const path = require('path');
const https = require('https');
const http = require('http');

// ============ 加载环境变量 ============
const fs = require('fs');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        process.env[match[1].trim()] = match[2].trim();
      }
    }
  });
}

// ============ 配置 ============
const CONFIG = {
  // Telegram 配置
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '',
  
  // 数据库路径
  DB_PATH: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'habits.db'),
  
  // 检查间隔（毫秒）
  CHECK_INTERVAL: parseInt(process.env.CHECK_INTERVAL) || 60 * 60 * 1000, // 1小时
  
  // 提醒窗口（从提醒时间开始，多少分钟内提醒）
  REMINDER_WINDOW: parseInt(process.env.REMINDER_WINDOW) || 60, // 60分钟
  
  // 是否只提醒一次（当天）
  ONCE_PER_DAY: process.env.ONCE_PER_DAY !== 'false',
};

// ============ 数据库 ============
let db;

function initDb() {
  db = new Database(CONFIG.DB_PATH);
  db.pragma('journal_mode = WAL');
  
  // 确保 allow_duplicate 列存在
  try {
    db.exec(`ALTER TABLE habits ADD COLUMN allow_duplicate INTEGER DEFAULT 0`);
  } catch (e) {
    // 列已存在
  }
}

// Import shared timezone utilities from db.js
const { getLocalDate: getLocalDateShared } = require('./db');

// ============ 工具函数 ============
/**
 * Get local date string in Asia/Shanghai timezone
 * @returns {string} - Date string in YYYY-MM-DD format
 */
function getLocalDate() {
  return getLocalDateShared();
}

/**
 * Get local time in Asia/Shanghai timezone
 * @returns {Date} - Date object adjusted to Asia/Shanghai timezone
 */
function getLocalTime() {
  const now = new Date();
  const dateStr = now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  return new Date(dateStr);
}

function formatTime(date) {
  // 使用 ISO 格式避免时区问题
  return date.toISOString().split('T')[1].slice(0, 5); // HH:MM
}

function parseReminderTime(reminderStr) {
  // 支持格式: "08:00", "08:00,20:00", "08:00-10:00", "6-22", "6:00-22:00"
  if (!reminderStr) return [];
  
  const times = [];
  const parts = reminderStr.split(',');
  
  for (const part of parts) {
    const range = part.trim().split('-');
    if (range.length === 2) {
      let start = range[0].trim();
      let end = range[1].trim();
      // 补齐冒号: "6" -> "6:00", "22" -> "22:00"
      if (!start.includes(':')) start = start + ':00';
      if (!end.includes(':')) end = end + ':00';
      times.push({ start, end });
    } else {
      // 单时间格式
      let time = part.trim();
      if (!time.includes(':')) time = time + ':00';
      times.push({ start: time, end: time });
    }
  }
  
  return times;
}

function isInReminderWindow(reminderTimes, currentTime) {
  const nowStr = formatTime(currentTime);
  
  for (const range of reminderTimes) {
    if (nowStr >= range.start && nowStr <= range.end) {
      return true;
    }
  }
  return false;
}

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function shouldRemind(reminderTimes, currentTime) {
  const nowStr = formatTime(currentTime);
  const nowMinutes = timeToMinutes(nowStr);
  
  for (const range of reminderTimes) {
    const startMinutes = timeToMinutes(range.start);
    let endMinutes = timeToMinutes(range.end);
    
    // 处理跨天情况 (如 21-0 表示 21:00 到次日 00:00)
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60; // 加1440分钟
    }
    
    // 如果当前时间在提醒窗口内（同一天）
    if (nowMinutes >= startMinutes && nowMinutes <= endMinutes) {
      return true;
    }
    
    // 处理跨天：当前时间在0-endMinutes也算
    if (range.end === '0' && nowMinutes <= endMinutes) {
      return true;
    }
    
    // 如果刚过提醒时间（在窗口内）
    if (nowMinutes - startMinutes <= CONFIG.REMINDER_WINDOW && nowMinutes >= startMinutes) {
      return true;
    }
  }
  
  return false;
}

// ============ Telegram 发送 ============
function isValidProxyUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    // 只允许 http 和 https 代理协议
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function sendTelegramMessage(text) {
  if (!CONFIG.TELEGRAM_BOT_TOKEN || !CONFIG.TELEGRAM_CHAT_ID) {
    console.log('[Telegram] 未配置，跳过发送');
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const { spawn } = require('child_process');

    const postData = JSON.stringify({
      chat_id: CONFIG.TELEGRAM_CHAT_ID,
      text: text
    });

    // Build curl arguments safely (no shell injection)
    const args = ['-s'];

    // Add proxy if configured (validate URL to prevent injection)
    const proxy = process.env.HTTPS_PROXY || process.env.https_proxy || '';
    if (proxy && isValidProxyUrl(proxy)) {
      args.push('-x', proxy);
    } else if (proxy) {
      console.log('[Telegram] 警告: 代理 URL 无效，已忽略:', proxy);
    }

    // Add URL and headers
    args.push(
      `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`,
      '-H', 'Content-Type: application/json',
      '-d', postData
    );

    const proc = spawn('curl', args, { timeout: 15000 });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data; });
    proc.stderr.on('data', (data) => { stderr += data; });

    proc.on('close', (code) => {
      if (code !== 0) {
        console.log('[Telegram] 发送失败:', stderr || `exit code ${code}`);
        reject(new Error(stderr || `exit code ${code}`));
        return;
      }
      try {
        const result = JSON.parse(stdout);
        if (result.ok) {
          console.log('[Telegram] 发送成功');
          resolve();
        } else {
          console.log('[Telegram] 发送失败:', result.description);
          reject(new Error(result.description));
        }
      } catch (e) {
        console.log('[Telegram] 解析失败:', stdout);
        reject(e);
      }
    });

    proc.on('error', (error) => {
      console.log('[Telegram] 发送失败:', error.message);
      reject(error);
    });
  });
}

// ============ 检查打卡状态 ============
function getUncheckedHabitsWithReminder() {
  const today = getLocalDate();
  
  const habits = db.prepare(`
    SELECT h.id, h.name, h.reminder_hours, h.allow_duplicate,
      (SELECT COUNT(*) FROM checkins c 
       WHERE c.habit_id = h.id AND date(c.checked_at) = ?) as today_checkins
    FROM habits h
    WHERE h.reminder_hours IS NOT NULL AND h.reminder_hours != ''
  `).all(today);
  
  const currentTime = getLocalTime();
  const result = [];
  
  for (const habit of habits) {
    // 如果允许重复打卡，跳过
    if (habit.allow_duplicate) continue;
    
    // 如果今天已打卡，跳过
    if (habit.today_checkins > 0) continue;
    
    // 检查是否在提醒时间
    const reminderTimes = parseReminderTime(habit.reminder_hours);
    if (shouldRemind(reminderTimes, currentTime)) {
      result.push(habit);
    }
  }
  
  return result;
}

// ============ 已提醒记录 ============
let remindedToday = new Set();

function loadRemindedToday() {
  // 从文件加载或重置
  const today = getLocalDate();
  remindedToday.clear();
  
  try {
    const fs = require('fs');
    const filePath = path.join(__dirname, '..', 'data', 'reminders.json');
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (data.date === today) {
        data.ids.forEach(id => remindedToday.add(id));
      }
    }
  } catch (e) {
    // 忽略
  }
}

function saveRemindedToday() {
  try {
    const fs = require('fs');
    const filePath = path.join(__dirname, '..', 'data', 'reminders.json');
    const data = {
      date: getLocalDate(),
      ids: Array.from(remindedToday)
    };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.log('[Error] 保存提醒记录失败:', e.message);
  }
}

// ============ 主循环 ============
async function checkAndRemind() {
  // 获取 Asia/Shanghai 时区的时间
  const now = getLocalTime();
  const timeStr = now.toTimeString().slice(0, 5); // HH:MM
  const [hours, mins] = timeStr.split(':').map(Number);
  const currentMinutes = hours * 60 + mins;
  const today = getLocalDate();
  
  // 检查是否在提醒时间窗口内 (6:00 - 23:59)
  const WINDOW_START = 6 * 60; // 6:00
  const WINDOW_END = 23 * 60 + 59; // 23:59
  
  if (currentMinutes < WINDOW_START || currentMinutes > WINDOW_END) {
    console.log(`[${timeStr}] 不在提醒时间窗口 (6:00-23:59)，跳过检查`);
    return;
  }

  console.log(`[${today} ${timeStr}] 检查打卡状态...`);
  
  try {
    initDb();
    loadRemindedToday();
    
    const uncheckedHabits = getUncheckedHabitsWithReminder();
    
    if (uncheckedHabits.length === 0) {
      console.log('所有有提醒的习惯都已打卡 ✅');
      return;
    }
    
    console.log(`发现 ${uncheckedHabits.length} 个未打卡习惯`);
    
    const habitNames = uncheckedHabits.map(h => `• ${h.name}`);
    
    if (habitNames.length > 0) {
      const message = `⏰ 打卡提醒\n\n尚未完成的习惯：\n${habitNames.join('\n')}\n\n点击打卡: http://all.keepone.work:3847/`;
      
      await sendTelegramMessage(message);
    }
    
  } catch (err) {
    console.error('检查失败:', err.message);
  }
}

// ============ 启动 ============
function start() {
  console.log('='.repeat(50));
  console.log('Habit Reminder Daemon 启动');
  console.log(`检查间隔: ${CONFIG.CHECK_INTERVAL / 1000 / 60} 分钟`);
  console.log(`数据库: ${CONFIG.DB_PATH}`);
  console.log(`Telegram: ${CONFIG.TELEGRAM_BOT_TOKEN ? '已配置' : '未配置'}`);
  console.log('='.repeat(50));
  
  // 立即检查一次
  checkAndRemind();
  
  // 定时检查
  setInterval(checkAndRemind, CONFIG.CHECK_INTERVAL);
}

// 导出
module.exports = { start, checkAndRemind };

// 直接运行
if (require.main === module) {
  start();
}
