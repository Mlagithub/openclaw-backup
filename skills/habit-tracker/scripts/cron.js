// scripts/cron.js - Called by OpenClaw Cron for habit reminders

const { Habits, isHourInRange, getLocalDate } = require('./db');

/**
 * Get current hour in Asia/Shanghai timezone
 * @returns {number} - Current hour (0-23)
 */
function getLocalHour() {
  const now = new Date();
  const dateStr = now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const localDate = new Date(dateStr);
  return localDate.getHours();
}

/**
 * Check for due habits and generate reminder message
 * Called by OpenClaw cron scheduler
 * @returns {Promise<object>} - Result with due count and message
 */
async function main() {
  console.log('Checking for due habits...');

  const hour = getLocalHour();
  
  // Get all data
  const allHabits = Habits.getAll();
  const todayCheckins = Habits.getTodayCheckins();
  const yesterdayCheckins = Habits.getYesterdayCheckins();
  
  const checkedToday = new Set(todayCheckins.filter(t => t.checkin_id).map(t => t.id));
  const checkedYesterday = new Set(yesterdayCheckins.filter(t => t.checkin_id).map(t => t.id));
  
  // 1. Today's unchecked habits (within time window)
  const todayUnchecked = allHabits.filter(h => {
    if (checkedToday.has(h.id)) return false;
    if (!isHourInRange(hour, h.reminder_hours)) return false;
    return true;
  });
  
  // 2. Yesterday's unchecked habits (regardless of time window)
  const yesterdayUnchecked = allHabits.filter(h => {
    if (checkedYesterday.has(h.id)) return false;
    if (checkedToday.has(h.id)) return false;
    return true;
  });
  
  console.log('Today unchecked:', todayUnchecked.map(h => h.name));
  console.log('Yesterday unchecked:', yesterdayUnchecked.map(h => h.name));
  
  if (todayUnchecked.length === 0 && yesterdayUnchecked.length === 0) {
    console.log('No due habits');
    return { due: 0 };
  }
  
  let message = '';
  
  // Yesterday's first
  if (yesterdayUnchecked.length > 0) {
    const list = yesterdayUnchecked.map(h => `• ${h.name}`).join('\n');
    message += `📥 **昨日未打卡** (${yesterdayUnchecked.length}个):\n${list}\n\n`;
  }
  
  // Then today's
  if (todayUnchecked.length > 0) {
    const list = todayUnchecked.map(h => `• ${h.name}`).join('\n');
    message += `📝 **今日待打卡** (${todayUnchecked.length}个):\n${list}\n`;
  }
  
  message += `\n回复 "打卡 习惯名" 打卡`;
  
  console.log('---MESSAGE---');
  console.log(message);
  
  return { due: todayUnchecked.length + yesterdayUnchecked.length, message };
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
