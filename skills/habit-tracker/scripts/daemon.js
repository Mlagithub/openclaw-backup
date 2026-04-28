// Load environment variables
require("dotenv").config();

// scripts/daemon.js - Background daemon for habit reminders

const { Habits } = require('./db');
const { sendDiscordDM } = require('./discord');

/**
 * Discord user ID for sending reminders
 * Configured via environment variable TARGET_USER_ID
 */
const TARGET_USER_ID = process.env.TARGET_USER_ID || '1085793212846854146';

/**
 * Check habits and send reminder if needed
 * @returns {Promise<object>} - Result with reminded status and count
 */
async function checkAndRemind() {
  const now = new Date();
  const timeStr = now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const hourMin = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  console.log(`[${timeStr}] Checking... Time: ${hourMin}`);
  
  // Get all habits
  const allHabits = Habits.getAll();
  
  // Get yesterday's check-ins
  const yesterdayCheckins = Habits.getYesterdayCheckins();
  const checkedYesterday = new Set(yesterdayCheckins.filter(c => c.checkin_id).map(c => c.id));
  
  // Get today's check-ins
  const todayCheckins = Habits.getTodayCheckins();
  const checkedToday = new Set(todayCheckins.filter(c => c.checkin_id).map(c => c.id));
  
  // Find habits not checked yesterday (昨天未打卡)
  const uncheckedYesterday = allHabits.filter(h => !checkedYesterday.has(h.id));
  
  // Find habits not checked today and within reminder time window (今天待打卡)
  const dueHabits = Habits.getDueHabits();
  
  let message = '';
  
  // Yesterday's unchecked first
  if (uncheckedYesterday.length > 0) {
    const habitList = uncheckedYesterday.map(h => `• ${h.name}`).join('\n');
    message += `📥 **昨日未打卡** (${uncheckedYesterday.length}个):\n${habitList}\n\n`;
  }
  
  // Then today's unchecked
  if (dueHabits.length > 0) {
    const habitList = dueHabits.map(h => `• ${h.name}`).join('\n');
    message += `📝 **今日待打卡** (${dueHabits.length}个):\n${habitList}\n`;
  }
  
  if (message) {
    message += `\n回复 "打卡 习惯名" 打卡`;
    
    const totalCount = dueHabits.length + uncheckedYesterday.length;
    console.log(`  📢 Sending reminder for ${totalCount} habits...`);
    
    const sent = await sendDiscordDM(TARGET_USER_ID, message);
    
    if (sent) {
      console.log(`  ✅ Reminder sent`);
    } else {
      console.log(`  ❌ Failed to send`);
    }
    
    return { reminded: true, count: totalCount };
  }
  
  console.log(`  ✅ All habits checked in or outside time window`);
  return { reminded: false, count: 0 };
}

/**
 * Main daemon entry point
 */
async function main() {
  console.log(`
╔═══════════════════════════════════════════╗
║   Habit Tracker Daemon - 习惯打卡守护进程  ║
╚═══════════════════════════════════════════╝
`);
  console.log(`Target User: ${TARGET_USER_ID}`);
  console.log(`Check interval: every 30 minutes`);
  console.log('');
  
  // Initial check
  await checkAndRemind();
  
  // Check every minute
  setInterval(async () => {
    try {
      await checkAndRemind();
    } catch (error) {
      console.error('Error in check loop:', error.message);
    }
  }, 1800 * 1000);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkAndRemind };
