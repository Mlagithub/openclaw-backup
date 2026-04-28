#!/usr/bin/env node
// service.js - FSRS Memory Service Daemon (Real-time Version)
// 检测到期卡片并通过 Discord Webhook 立即发送提醒

const path = require('path');
const https = require('https');
const http = require('http');

// Proxy agent support
const { HttpsProxyAgent } = require('https-proxy-agent');

const SKILL_ROOT = path.join(__dirname);

// Load FSRS modules
const Storage = require(path.join(SKILL_ROOT, 'src', 'storage'));
const Scheduler = require(path.join(SKILL_ROOT, 'src', 'scheduler'));

// Configuration
const CONFIG = {
  // Discord Webhook URL (设置环境变量或在这里硬编码)
  webhookUrl: process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1476549088957698079/CC-uWkcYBSErbORMpypg8HnKpZIGdq5xf1NbA8hISKSDxl-sJ_W_yRjZB5CYGgl_C-zT',
  // 检查间隔（毫秒）- 默认 30 秒，实现真正的实时检测
  checkInterval: parseInt(process.env.CHECK_INTERVAL) || 30 * 1000,
  // 频道 ID（用于日志）
  channelId: process.env.DISCORD_CHANNEL_ID || '1475710747114737717',
  // 同一卡片提醒冷却时间（毫秒）- 默认 2 小时
  cooldownMs: parseInt(process.env.REMINDER_COOLDOWN) || 2 * 60 * 60 * 1000,
  // 是否启用详细日志
  verbose: process.env.VERBOSE === 'true'
};

// State file for tracking sent reminders
const STATE_FILE = path.join(SKILL_ROOT, 'data', 'reminder-state.json');

// Load reminder state
function loadState() {
  try {
    const fs = require('fs');
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[Error] Failed to load state:', e.message);
  }
  return { sent: {}, cooldownList: [] };
}

// Save reminder state
function saveState(state) {
  const fs = require('fs');
  const dataDir = path.join(SKILL_ROOT, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// Send Discord message via Webhook
function sendDiscordMessage(message) {
  return new Promise((resolve, reject) => {
    const url = new URL(CONFIG.webhookUrl);
    
    const data = JSON.stringify({
      content: message,
      username: 'FSRS 复习助手',
      avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png'
    });
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      },
      agent: new HttpsProxyAgent(process.env.HTTPS_PROXY || process.env.http_proxy || process.env.ALL_PROXY)
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Check if reminder should be sent (cooldown check)
function shouldRemind(cardId, state) {
  const now = Date.now();
  
  // Check if in cooldown list
  const cooldownEntry = state.cooldownList.find(c => c.cardId === cardId);
  if (cooldownEntry) {
    if (now - cooldownEntry.sentAt < CONFIG.cooldownMs) {
      // Still in cooldown
      return false;
    } else {
      // Cooldown expired, remove from list
      state.cooldownList = state.cooldownList.filter(c => c.cardId !== cardId);
    }
  }
  
  // Check if already sent recently (backward compatibility)
  if (state.sent[cardId]) {
    const sentAt = state.sent[cardId];
    if (now - sentAt < CONFIG.cooldownMs) {
      return false;
    }
    // Clean up old entry
    delete state.sent[cardId];
  }
  
  return true;
}

// Mark reminder as sent
function markReminded(cardId, state) {
  const now = Date.now();
  
  // Add to cooldown list
  state.cooldownList.push({
    cardId: cardId,
    sentAt: now
  });
  
  // Also keep in old format for backward compatibility
  state.sent[cardId] = now;
  
  // Clean up old cooldown entries (older than 25 hours)
  const cutoff = now - (CONFIG.cooldownMs + 60 * 60 * 1000);
  state.cooldownList = state.cooldownList.filter(c => c.sentAt > cutoff);
  
  saveState(state);
}

// Check and send reminders for due cards
async function checkAndSendReminders() {
  const state = loadState();
  const dueInfo = Scheduler.checkDueCards();
  
  if (dueInfo.count === 0) {
    if (CONFIG.verbose) {
      console.log(`[${new Date().toISOString()}] No due cards.`);
    }
    return;
  }
  
  console.log(`[${new Date().toISOString()}] Found ${dueInfo.count} due cards`);
  
  let sentCount = 0;
  
  for (const card of dueInfo.cards) {
    // Check cooldown
    if (!shouldRemind(card.id, state)) {
      if (CONFIG.verbose) {
        console.log(`[Card #${card.id}] Skipped (in cooldown)`);
      }
      continue;
    }
    
    // Build reminder message
    const message = `🔔 **FSRS 复习提醒**\n\n` +
      `📝 **卡片 #${card.id}**\n\n` +
      `**问题:** ${card.question}\n\n` +
      `💡 回复 "复习" 开始回忆！\n` +
      `━━━━━━━━━━━━━━━━━━━━`;
    
    try {
      await sendDiscordMessage(message);
      markReminded(card.id, state);
      sentCount++;
      console.log(`[${new Date().toISOString()}] ✅ Sent reminder for card #${card.id}: "${card.question.substring(0, 30)}..."`);
    } catch (e) {
      console.error(`[${new Date().toISOString()}] ❌ Failed to send reminder for card #${card.id}:`, e.message);
    }
  }
  
  if (sentCount > 0) {
    console.log(`[${new Date().toISOString()}] 📤 Sent ${sentCount} reminder(s)`);
  }
}

// Check webhook URL configuration
function checkConfig() {
  if (CONFIG.webhookUrl.includes('your-webhook-here')) {
    console.log('');
    console.log('⚠️  WARNING: Discord Webhook URL not configured!');
    console.log('⚠️  Please set DISCORD_WEBHOOK_URL environment variable:');
    console.log('');
    console.log('   export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."');
    console.log('');
    console.log('   To create a webhook:');
    console.log('   1. Server Settings → Integrations → Webhooks');
    console.log('   2. Create Webhook → Copy URL');
    console.log('');
    return false;
  }
  return true;
}

// Health check endpoint (optional)
function startHealthCheckServer() {
  if (!process.env.ENABLE_HEALTH_CHECK) return;
  
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      const dueInfo = Scheduler.checkDueCards();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        dueCards: dueInfo.count,
        timestamp: new Date().toISOString()
      }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  
  const port = parseInt(process.env.HEALTH_CHECK_PORT) || 3000;
  server.listen(port, () => {
    console.log(`[Health] Server running on port ${port}`);
  });
}

// Main
console.log('===================================================');
console.log('   FSRS Memory Service Daemon (Real-time Mode)');
console.log('===================================================');
console.log(`📅 Started at: ${new Date().toISOString()}`);
console.log(`⏱️  Check Interval: ${CONFIG.checkInterval / 1000} seconds`);
console.log(`🔔 Cooldown: ${CONFIG.cooldownMs / (60 * 60 * 1000)} hours`);
console.log(`📁 State File: ${STATE_FILE}`);
console.log('===================================================');

// Check configuration
const configOk = checkConfig();
if (!configOk) {
  console.log('⚠️  Running in demo mode (no messages will be sent)');
  console.log('');
}

// Start health check server if enabled
startHealthCheckServer();

// Initial check
setTimeout(checkAndSendReminders, 1000);

// Periodic check - using tighter interval for real-time
setInterval(checkAndSendReminders, CONFIG.checkInterval);

// Export for testing
module.exports = {
  checkAndSendReminders,
  CONFIG,
  loadState,
  saveState
};
