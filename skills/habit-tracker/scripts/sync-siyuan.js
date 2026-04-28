// scripts/sync-siyuan.js - Sync habits and check-ins from Siyuan Note

const fs = require('fs');
const path = require('path');
const { Habits, db } = require('./db');

/**
 * Siyuan habit file path
 * Configured via environment variable SIYUAN_DATA_PATH
 * Falls back to Windows default path
 */
const SIYUAN_HABIT_PATH = process.env.SIYUAN_DATA_PATH 
  ? path.join(process.env.SIYUAN_DATA_PATH, 'storage/petal/siyuan-plugin-task-note-management/habit.json')
  : '/mnt/c/Users/one/SiYuan/data/storage/petal/siyuan-plugin-task-note-management/habit.json';

/**
 * Sync habits and check-ins from Siyuan Note to local database
 * @returns {object} - Sync result with counts
 */
function syncFromSiyuan() {
  if (!fs.existsSync(SIYUAN_HABIT_PATH)) {
    console.log('Siyuan habit file not found:', SIYUAN_HABIT_PATH);
    console.log('Set SIYUAN_DATA_PATH environment variable if using custom path');
    return { imported: 0, skipped: 0, checkins: 0 };
  }
  
  let data;
  try {
    data = JSON.parse(fs.readFileSync(SIYUAN_HABIT_PATH, 'utf-8'));
  } catch (err) {
    console.error('Failed to parse Siyuan habit file:', err.message);
    return { imported: 0, skipped: 0, checkins: 0 };
  }
  
  let habitsImported = 0;
  let habitsSkipped = 0;
  let checkinsImported = 0;
  
  for (const [id, habit] of Object.entries(data)) {
    // Get or create habit in local DB
    let dbHabit = Habits.getByName(habit.title);
    
    if (!dbHabit) {
      const result = Habits.add(`${habit.title}::从思源笔记导入 (开始于 ${habit.startDate})`);
      if (result.error) {
        console.log(`Error importing "${habit.title}": ${result.error}`);
        continue;
      }
      dbHabit = Habits.getByName(habit.title);
      habitsImported++;
      console.log(`Imported: ${habit.title}`);
    } else {
      console.log(`Found existing: ${habit.title}`);
      habitsSkipped++;
    }
    
    // Import check-ins
    if (habit.checkIns) {
      const checkinDates = Object.keys(habit.checkIns).sort();
      let habitCheckins = 0;

      // Use transaction for batch import
      const importTransaction = db.transaction(() => {
        for (const date of checkinDates) {
          // Check if already exists
          const existing = db.prepare(
            'SELECT id FROM checkins WHERE habit_id = ? AND date(checked_at) = ?'
          ).get(dbHabit.id, date);

          if (!existing) {
            const checkin = habit.checkIns[date];
            const timestamp = checkin.timestamp || `${date} 00:00`;

            db.prepare(
              'INSERT INTO checkins (habit_id, checked_at, note) VALUES (?, ?, ?)'
            ).run(dbHabit.id, timestamp, `导入 (状态：${checkin.status?.join(',') || 'completed'})`);

            habitCheckins++;
          }
        }
      });

      importTransaction();
      
      checkinsImported += habitCheckins;
      console.log(`  -> Imported ${habitCheckins} check-ins for "${habit.title}"`);
    }
  }
  
  return { habitsImported, habitsSkipped, checkinsImported };
}

// CLI mode
if (require.main === module) {
  console.log('Syncing from Siyuan Note...');
  const result = syncFromSiyuan();
  console.log('\n--- Result ---');
  console.log('Habits imported:', result.habitsImported);
  console.log('Habits skipped:', result.habitsSkipped);
  console.log('Check-ins imported:', result.checkinsImported);
}

module.exports = { syncFromSiyuan };
