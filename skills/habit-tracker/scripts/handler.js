// scripts/handler.js - Discord message handler for habit tracking

const { Habits, getLocalDate } = require('./db');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { handleMultiplePhotos } = require('./image-handler');

// Config
const IMAGES_DIR = path.join(__dirname, '..', 'data', 'images');
const DISCORD_TOKEN = process.env.DISCORD_TOKEN || '';

// Ensure images directory exists
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

/**
 * Download image from URL to local storage
 * @param {string} url - Image URL
 * @param {string} filename - Target filename
 * @returns {Promise<string>} - Saved filename
 */
async function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path.join(IMAGES_DIR, filename));
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        file.close();
        reject(new Error(`Download failed: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filename);
      });
    }).on('error', (err) => {
      fs.unlink(path.join(IMAGES_DIR, filename), () => {});
      reject(err);
    });
  });
}

/**
 * Extract habit name from message
 * Issue 7: Use word boundary matching to avoid false positives
 * @param {string} text - Message text
 * @returns {string|null} - Habit name or null
 */
function extractHabitName(text) {
  // Define keyword to habit mappings with word boundary awareness
  // Order matters: check longer/more specific patterns first
  const keywordPatterns = [
    // Meals - use word boundaries
    { pattern: /\b早餐\b/, habit: '早餐' },
    { pattern: /\b午餐\b/, habit: '午餐' },
    { pattern: /\b晚餐\b/, habit: '晚餐' },
    { pattern: /\b午饭\b/, habit: '午餐' },
    { pattern: /\b晚饭\b/, habit: '晚餐' },
    // Short forms - only match when followed by non-keyword char or end
    { pattern: /早(?!餐|饭)/, habit: '早餐' },
    { pattern: /(?<!早|晚)中(?!餐|午)/, habit: '午餐' },
    { pattern: /晚(?!餐|饭)/, habit: '晚餐' },
    // Activities
    { pattern: /\b站桩\b/, habit: '站桩' },
    { pattern: /\b运动\b/, habit: '运动' },
    { pattern: /\b健身\b/, habit: '健身' },
    { pattern: /\b阅读\b/, habit: '阅读' },
    { pattern: /\b学习\b/, habit: '学习' },
    { pattern: /\b工作\b/, habit: '工作' }
  ];
  
  for (const { pattern, habit } of keywordPatterns) {
    if (pattern.test(text)) {
      return habit;
    }
  }
  return null;
}

/**
 * Format streak with fire emoji
 * @param {number} streak - Streak days
 * @returns {string} - Formatted streak string
 */
function formatStreak(streak) {
  if (streak >= 30) return `🏆 ${streak}天`;
  if (streak >= 14) return `🔥 ${streak}天`;
  if (streak >= 7) return `⭐ ${streak}天`;
  if (streak > 0) return `✨ ${streak}天`;
  return '';
}

/**
 * Get status emoji for habit
 * @param {boolean} checkedToday - Whether checked in today
 * @param {number} streak - Current streak
 * @returns {string} - Status emoji
 */
function getStatusEmoji(checkedToday, streak) {
  if (checkedToday && streak >= 7) return '🔥';
  if (checkedToday) return '✅';
  if (streak > 0) return '⏳';
  return '💤';
}

/**
 * Handle incoming Discord message for habit tracking (async version)
 * @param {string} content - Message content
 * @param {string} userId - User ID
 * @param {Array} attachments - Message attachments
 * @returns {Promise<string|null>} - Response message or null
 */
async function handleMessage(content, userId, attachments = []) {
  const text = content?.trim() || '';
  const cmd = text.toLowerCase();
  
  // Skip if empty and no attachments
  if (!text && attachments.length === 0) return null;
  
  // Help command - 美化版
  if (cmd === '习惯帮助' || cmd === 'habits help' || cmd === '!habits') {
    return `📖 **习惯打卡助手**

▸ **添加习惯**
   习惯 早餐::描述::7-9

▸ **打卡**
   打卡 早餐
   打卡 早餐 吃了面条

▸ **📷 照片打卡**
   发送照片 + "打卡 早餐"
   支持 AI 智能识别食物/活动

▸ **修改记录**
   修改 早餐 新的备注内容

▸ **查看统计**
   习惯列表
   统计 早餐

▸ **删除习惯**
   删除习惯 早餐`;
  }
  
  // Add habit: 习惯 名称::描述::提醒时间
  const addMatch = text.match(/^(习惯|habit)\s+(.+)$/i);
  if (addMatch) {
    const rest = addMatch[2].trim();
    if (rest.length > 100) return '❌ 习惯名称过长，最多100个字符';
    const result = Habits.add(rest);
    if (result.error) return `❌ ${result.error}`;
    
    let msg = `✨ **习惯创建成功**\n\n`;
    msg += `📌 **${result.name}**`;
    if (result.description) msg += `\n📝 ${result.description}`;
    if (result.reminderHours) msg += `\n⏰ 提醒时段：${result.reminderHours}`;
    return msg;
  }
  
  // Delete habit
  const deleteMatch = text.match(/^删除习惯\s+(.+)$/i);
  if (deleteMatch) {
    const name = deleteMatch[1].trim();
    const habit = Habits.getByName(name);
    if (!habit) return `❌ 找不到习惯「**${name}**」`;
    Habits.delete(habit.id);
    return `🗑️ 已删除习惯「**${name}**」`;
  }
  
  // List habits - 美化版
  if (cmd === '习惯列表' || cmd === 'habit list' || cmd === '!habits list') {
    const habits = Habits.getAll();
    if (habits.length === 0) return '📝 还没有习惯！用 `习惯 名称::描述` 添加';
    
    const todayCheckins = Habits.getTodayCheckins();
    const checkedToday = new Set(todayCheckins.filter(t => t.checkin_id).map(t => t.id));
    
    const list = habits.map(h => {
      const streak = Habits.getStreak(h.id);
      const statusEmoji = getStatusEmoji(checkedToday.has(h.id), streak);
      const streakText = formatStreak(streak);
      const timeHint = h.reminder_hours ? ` \`${h.reminder_hours}\`` : '';
      
      let line = `${statusEmoji} **${h.name}**${timeHint}`;
      if (streakText) line += ` ${streakText}`;
      return line;
    }).join('\n');
    
    const completedCount = checkedToday.size;
    const totalCount = habits.length;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    
    let msg = `📋 **今日习惯** \`(${completedCount}/${totalCount})\`\n\n`;
    msg += list;
    msg += `\n\n📊 今日完成率：**${progress}%**`;
    
    return msg;
  }
  
  // 修改打卡记录
  const editMatch = text.match(/^(修改|edit)\s+(.+?)(?:\s+(.+))?$/i);
  if (editMatch) {
    const habitName = editMatch[2].trim();
    const newNote = editMatch[3]?.trim() || '';
    
    if (!newNote) {
      return '⚠️ 请提供新的备注内容\n格式：`修改 习惯名 新内容`';
    }
    
    const habit = Habits.getByName(habitName);
    if (!habit) return `❌ 找不到习惯「**${habitName}**」`;
    
    const result = Habits.updateLatestCheckin(habit.id, newNote);
    
    if (result.error) {
      return `⚠️ ${result.error}`;
    }
    
    let msg = `✏️ **修改成功**\n\n`;
    msg += `📌 习惯：**${habit.name}**\n`;
    if (result.oldNote) {
      msg += `❌ 原内容：${result.oldNote}\n`;
    }
    msg += `✅ 新内容：${newNote}`;
    
    return msg;
  }
  
  // Check in command or photo check-in
  const isCheckin = text.match(/^(打卡|checkin)\s*(.*)$/i) || 
                    (attachments.length > 0 && (text.includes('打卡') || text.includes('checkin')));
  
  if (isCheckin) {
    let habitName = '';
    let note = '';
    
    // Extract habit name and note from text
    if (text.match(/^(打卡|checkin)\s*(.*)$/i)) {
      const match = text.match(/^(打卡|checkin)\s*(.*)$/i);
      const rest = (match[2] || '').trim();
      const parts = rest.split(' ');
      habitName = parts[0];
      note = parts.slice(1).join(' ').trim();
    }
    
    // Try to extract habit name from keywords if not found
    if (!habitName || habitName === '') {
      habitName = extractHabitName(text);
    }
    
    // Handle pure photo check-in (no text, just images)
    if (!habitName && attachments.length > 0) {
      return '📷 收到照片！请告诉我是哪个习惯，例如：\n`打卡 早餐` 或 `打卡 站桩`';
    }
    
    if (!habitName) {
      return '⚠️ 请指定习惯名，如：`打卡 早餐`';
    }
    
    const habit = Habits.getByName(habitName);
    if (!habit) return `❌ 找不到习惯「**${habitName}**」`;
    
    // Process photo attachments with AI recognition
    let imageNote = '';
    let imageCount = 0;
    
    if (attachments.length > 0) {
      console.log(`Processing ${attachments.length} attachments for habit: ${habitName}`);
      
      const photoResult = await handleMultiplePhotos(attachments, habitName, note);
      
      if (photoResult.success) {
        imageCount = photoResult.count;
        imageNote = photoResult.note;
        console.log(`AI analysis complete: ${imageNote}`);
      } else {
        // Fallback: just download images without AI analysis
        for (const attachment of attachments) {
          if (attachment.url && attachment.url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            const timestamp = Date.now();
            const ext = path.extname(attachment.url.split('?')[0]) || '.jpg';
            const filename = `${habitName}_${timestamp}${ext}`;
            try {
              await downloadImage(attachment.url, filename);
              imageCount++;
            } catch (e) {
              console.error('Download error:', e.message);
            }
          }
        }
        imageNote = note || (imageCount > 0 ? `[📷 ${imageCount}张照片]` : '');
      }
    } else {
      imageNote = note;
    }
    
    // Use append checkin to allow multiple checkins per day
    if (imageNote && imageNote.length > 5000) {
      return '❌ 笔记内容过长，最多5000个字符';
    }
    const result = Habits.appendCheckin(habit.id, null, imageNote);
    
    if (result.error) {
      return `⚠️ ${result.error}`;
    }
    
    const streak = Habits.getStreak(habit.id);
    const streakText = formatStreak(streak);
    
    // 美化打卡成功消息
    let msg = `✅ **打卡成功**\n\n`;
    msg += `📌 **${habit.name}**`;
    
    if (imageCount > 0) {
      msg += `\n📷 已保存 ${imageCount} 张照片`;
    }
    
    if (imageNote && !imageNote.includes('AI 识别')) {
      msg += `\n📝 ${imageNote}`;
    }
    
    if (streakText) {
      msg += `\n\n${streakText}`;
    }
    
    return msg;
  }
  
  // Stats command - 美化版
  const statsMatch = text.match(/^(统计|stats)\s+(.+)$/i);
  if (statsMatch) {
    const name = statsMatch[2].trim();
    const habit = Habits.getByName(name);
    if (!habit) return `❌ 找不到习惯「**${name}**」`;
    
    const checkins = Habits.getCheckins(habit.id, 30);
    const streak = Habits.getStreak(habit.id);
    const total = checkins.length;
    
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const weekCheckins = checkins.filter(c => new Date(c.checked_at) >= weekStart).length;
    
    // 计算本周天数
    const dayOfWeek = now.getDay();
    const daysThisWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
    const weekRate = Math.round((weekCheckins / daysThisWeek) * 100);
    
    let msg = `📊 **${habit.name}** 统计\n\n`;
    msg += `┌──────────────┐\n`;
    msg += `│ 🔥 连续 ${streak} 天`;
    if (streak >= 7) msg += ' ⭐';
    msg += `\n`;
    msg += `│ 📅 本周 ${weekCheckins} 次\n`;
    msg += `│ 📈 30天 ${total} 次\n`;
    msg += `└──────────────┘\n`;
    msg += `\n📊 本周完成率：**${weekRate}%**`;
    
    if (habit.reminder_hours) {
      msg += `\n⏰ 提醒时段：${habit.reminder_hours}`;
    }
    if (habit.description) {
      msg += `\n📝 ${habit.description}`;
    }
    
    return msg;
  }
  
  return null;
}

module.exports = { handleMessage, downloadImage, extractHabitName };