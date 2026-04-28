// scripts/discord.js - Discord DM helper with proxy support
const { HttpsProxyAgent } = require('https-proxy-agent');
const { request } = require('https');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN || '';
const PROXY_URL = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || null;

async function discordRequest(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = `https://discord.com/api/v10${endpoint}`;
    
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bot ${DISCORD_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'DiscordBot (OpenClaw HabitTracker, 1.0)'
      }
    };
    
    // Add proxy agent if configured
    if (PROXY_URL) {
      reqOptions.agent = new HttpsProxyAgent(PROXY_URL);
    }
    
    const req = request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`Discord API error ${res.statusCode}: ${parsed.message || data}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          if (res.statusCode >= 400) {
            reject(new Error(`Discord API error ${res.statusCode}: ${data}`));
          } else {
            resolve(data);
          }
        }
      });
    });
    
    req.on('error', (err) => reject(new Error(`Discord request failed: ${err.message}`)));
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Discord request timeout'));
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function sendDiscordDM(userId, message) {
  if (!DISCORD_TOKEN) {
    console.error('Discord token not configured.');
    return false;
  }
  
  try {
    // Create or get DM channel
    const channel = await discordRequest('/users/@me/channels', {
      method: 'POST',
      body: { recipient_id: userId }
    });
    
    if (!channel || !channel.id) {
      console.error('Failed to create DM channel');
      return false;
    }
    
    // Send message
    await discordRequest(`/channels/${channel.id}/messages`, {
      method: 'POST',
      body: { content: message }
    });
    
    return true;
  } catch (error) {
    console.error('DM error:', error.message);
    return false;
  }
}

module.exports = { sendDiscordDM, discordRequest, DISCORD_TOKEN };
