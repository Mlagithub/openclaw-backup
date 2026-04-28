// handler.js - Discord message handler for FSRS skill
const path = require('path');

// Get skill root directory (parent of scripts/)
const SKILL_ROOT = path.resolve(__dirname, '..');

// Load FSRS modules
const Storage = require(path.join(SKILL_ROOT, 'src', 'storage'));
const Scheduler = require(path.join(SKILL_ROOT, 'src', 'scheduler'));

// Parse card input
function parseCardInput(text) {
  // Try :: first, then :
  let separator = '::';
  if (!text.includes('::')) {
    separator = ':';
  }
  
  const parts = text.split(separator);
  
  if (parts.length < 2) return null;
  
  return {
    question: parts[0].trim(),
    answer: parts.slice(1).join(separator).trim()
  };
}

// Handle incoming message
function handleMessage(content, userId) {
  const text = content.trim();
  
  // Skip if empty
  if (!text) return null;
  
  // Skip if looks like a command to other systems
  if (text.startsWith('/') && !text.startsWith('/fsrs')) {
    return null;
  }
  
  // Check for card input (contains :: or :)
  // Must NOT be a command
  const isCommand = /^(添加|add|列表|list|统计|stats|待复习|due|复习|review|帮助|help|删除|delete)\s*/i.test(text);
  const hasSeparator = text.includes('::') || text.includes(':');
  
  if (hasSeparator && !isCommand && !text.startsWith('!')) {
    const card = parseCardInput(text);
    if (card && card.question && card.answer) {
      const id = Storage.addCard(card.question, card.answer);
      return `✅ 卡片已添加！ (ID: ${id})\n\n**问题:** ${card.question}\n**答案:** ${card.answer}`;
    }
  }
  
  // Normalize command
  const cmd = text.toLowerCase().trim();
  
  // Add command
  const addMatch = text.match(/^(添加|add)\s+(.+)$/i);
  if (addMatch) {
    const cardContent = addMatch[2].trim();
    const card = parseCardInput(cardContent);
    if (!card) return '❌ 格式错误！用法: 添加 问题::答案 或 问题:答案';
    const id = Storage.addCard(card.question, card.answer);
    return `✅ 卡片已添加！ (ID: ${id})\n\n**问题:** ${card.question}\n**答案:** ${card.answer}`;
  }
  
  // Delete command
  const deleteMatch = text.match(/^(删除|delete)\s+(\d+)$/i);
  if (deleteMatch) {
    const cardId = parseInt(deleteMatch[2]);
    Storage.deleteCard(cardId);
    return `🗑️ 卡片 #${cardId} 已删除`;
  }
  
  // List command
  if (cmd === '列表' || cmd === 'list' || cmd === '!list') {
    const cards = Storage.getAllCards();
    if (cards.length === 0) return '📚 还没有卡片！直接发 "问题::答案" 添加';
    
    const list = cards.slice(0, 10).map(c => {
      const due = new Date(c.due_date) <= new Date() ? '🔴' : '🟢';
      return `${due} **${c.question.substring(0, 30)}**\n   📝 ${c.answer.substring(0, 40)}${c.answer.length > 40 ? '...' : ''}`;
    }).join('\n\n');
    
    const more = cards.length > 10 ? `\n\n...还有 ${cards.length - 10} 张` : '';
    return `📚 共 ${cards.length} 张卡片:\n\n${list}${more}`;
  }
  
  // Stats command
  if (cmd === '统计' || cmd === 'stats' || cmd === '!stats') {
    const stats = Scheduler.getStats();
    return `📊 **学习统计**\n\n• 总卡片: ${stats.total}\n• 待复习: ${stats.due}\n• 已复习: ${stats.reviewed}`;
  }
  
  // Due command
  if (cmd === '待复习' || cmd === 'due' || cmd === '!due') {
    const { count, cards } = Scheduler.checkDueCards();
    if (count === 0) return '🎉 太棒了！没有待复习的卡片！';
    
    const list = cards.slice(0, 5).map(c => `• ${c.question.substring(0, 40)}`).join('\n');
    const more = count > 5 ? `\n...还有 ${count - 5} 张` : '';
    return `📅 **${count} 张待复习:**\n\n${list}${more}\n\n回复 "复习" 开始！`;
  }
  
  // Help command
  if (cmd === '帮助' || cmd === 'help' || cmd === '!help') {
    return `📖 **FSRS 记忆助手**\n\n` +
      `**添加卡片:**\n` +
      `• 直接发: 问题::答案\n` +
      `• 或: 添加 问题::答案\n\n` +
      `**命令:**\n` +
      `• 列表 - 查看所有卡片\n` +
      `• 统计 - 学习统计\n` +
      `• 待复习 - 查看待复习\n` +
      `• 复习 - 开始复习\n` +
      `• 删除 <ID> - 删除卡片\n\n` +
      `**复习评分:**\n` +
      `1 = 完全忘记  |  2 = 记得困难\n` +
      `3 = 正常回忆  |  4 = 容易回忆\n` +
      `5 = 瞬间记住`;
  }
  
  // Review command (start)
  if (cmd === '复习' || cmd === 'review' || cmd === '!review') {
    return startReview();
  }
  
  // Check for review rating (1-5)
  if (/^[1-5]$/.test(text)) {
    return handleReviewRating(text, userId);
  }
  
  return null;
}

// Review session storage (in-memory per session)
const reviewSessions = {};

function startReview() {
  const card = Scheduler.getNextCard();
  if (!card) return '🎉 没有待复习的卡片！';
  
  // Store session
  reviewSessions['current'] = { card, timestamp: Date.now() };
  
  return `📝 **复习卡片 #${card.id}**\n\n**问题:** ${card.question}\n\n` +
    `回复 1-5 评分:\n` +
    `1 = 完全忘记  |  2 = 记得困难\n` +
    `3 = 正常回忆  |  4 = 容易回忆\n` +
    `5 = 瞬间记住\n\n` +
    `或回复 "答案" 查看答案`;
}

function handleReviewRating(rating, userId) {
  const session = reviewSessions['current'];
  if (!session) return '没有正在进行的复习，输入 "复习" 开始！';
  
  const result = Scheduler.processReview(session.card.id, parseInt(rating));
  delete reviewSessions['current'];
  
  if (result.error) return `❌ ${result.error}`;
  
  const ratingText = {
    1: '😢 Again',
    2: '😓 Hard',
    3: '😊 Good',
    4: '😄 Easy',
    5: '🎯 Perfect'
  };
  
  const nextCard = Scheduler.getNextCard();
  const more = nextCard ? '\n\n还有卡片！回复 "复习" 继续！' : '\n\n🎉 全部复习完成！';
  
  return `${ratingText[rating]} | 下次复习: ${result.nextInterval}\n\n📋 ${session.card.answer.substring(0, 100)}${more}`;
}

// Export for use
module.exports = { handleMessage, checkAndSendReminders };

// Function to check reminder queue and send Discord notifications
// This should be called by the skill when handling messages
async function checkAndSendReminders(messageTool) {
  const path = require('path');
  const SKILL_ROOT = path.resolve(__dirname, '..');
  const QUEUE_FILE = path.join(SKILL_ROOT, 'data', 'reminder-queue.json');
  const fs = require('fs');
  
  if (!messageTool) {
    return { success: false, reason: 'No message tool available' };
  }
  
  // Load queue
  let queue = { notified: [], pending: [] };
  try {
    if (fs.existsSync(QUEUE_FILE)) {
      queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
    }
  } catch (e) {
    return { success: false, reason: 'Failed to load queue' };
  }
  
  if (queue.pending.length === 0) {
    return { success: true, sent: 0 };
  }
  
  // Send reminders for pending cards
  let sent = 0;
  const remaining = [];
  
  for (const reminder of queue.pending) {
    try {
      const message = `🔔 **FSRS 复习提醒**\n\n` +
        `📝 **卡片 #${reminder.id}**\n\n` +
        `**问题:** ${reminder.question}\n\n` +
        `输入 "复习" 开始回忆！`;
      
      await messageTool({
        action: 'send',
        channel: 'discord',
        target: '1475722914904014958',
        message: message
      });
      
      sent++;
      console.log(`[Handler] Sent reminder for card #${reminder.id}`);
    } catch (e) {
      console.error(`[Handler] Failed to send reminder:`, e.message);
      remaining.push(reminder);
    }
  }
  
  // Update queue - keep only remaining
  queue.pending = remaining;
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
  
  return { success: true, sent };
}
