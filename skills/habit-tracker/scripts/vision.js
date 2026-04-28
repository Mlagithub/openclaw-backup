// scripts/vision.js - Vision AI for image recognition
// Supports: bailian/qwen3.5-plus, bailian/kimi-k2.5, zhipu/glm-4v

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

/**
 * Vision Model Configurations
 * API keys are loaded from environment variables for security.
 * Set these in your .env file:
 *   VISION_BAILIAN_API_KEY - For bailian models (qwen, kimi)
 *   VISION_ZHIPU_API_KEY - For zhipu models (glm-4v)
 */
const MODEL_CONFIGS = {
  'bailian/qwen3.5-plus': {
    baseUrl: 'https://coding.dashscope.aliyuncs.com/v1',
    apiKey: process.env.VISION_BAILIAN_API_KEY || process.env.BAILIAN_API_KEY || '',
    model: 'qwen3.5-plus',
    apiFormat: 'openai'
  },
  'bailian/kimi-k2.5': {
    baseUrl: 'https://coding.dashscope.aliyuncs.com/v1',
    apiKey: process.env.VISION_BAILIAN_API_KEY || process.env.BAILIAN_API_KEY || '',
    model: 'kimi-k2.5',
    apiFormat: 'openai'
  },
  'zhipu/glm-4v': {
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    apiKey: process.env.VISION_ZHIPU_API_KEY || process.env.ZHIPU_API_KEY || '',
    model: 'glm-4v',
    apiFormat: 'zhipu'
  }
};

// Check API keys at module load time and warn if missing
if (!MODEL_CONFIGS['bailian/qwen3.5-plus'].apiKey && !MODEL_CONFIGS['zhipu/glm-4v'].apiKey) {
  console.warn('[vision.js] Warning: No vision API keys configured. Set VISION_BAILIAN_API_KEY or VISION_ZHIPU_API_KEY in .env file.');
}

/**
 * Default model for vision tasks
 */
const DEFAULT_MODEL = 'bailian/qwen3.5-plus';

/**
 * Maximum image file size (10MB)
 */
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

/**
 * Convert image to base64
 * @param {string} imagePath - Local path to image
 * @returns {string} - Base64 encoded image
 */
function imageToBase64(imagePath) {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image file not found: ${imagePath}`);
  }

  const stats = fs.statSync(imagePath);
  if (stats.size > MAX_IMAGE_SIZE) {
    throw new Error(`Image file too large: ${(stats.size / 1024 / 1024).toFixed(2)}MB (max 10MB)`);
  }

  return fs.readFileSync(imagePath).toString('base64');
}

/**
 * Get MIME type from file extension
 * @param {string} imagePath - Image path
 * @returns {string} - MIME type
 */
function getMimeType(imagePath) {
  const ext = path.extname(imagePath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };
  return mimeTypes[ext] || 'image/jpeg';
}

/**
 * Call vision model API to analyze image
 * @param {string} imagePath - Local path to image file
 * @param {string} prompt - Analysis prompt
 * @param {string} modelName - Model to use (default: qwen3.5-plus)
 * @returns {Promise<string>} - AI analysis result
 */
async function analyzeImage(imagePath, prompt = '请描述这张图片中的内容。如果是食物，请说明是什么菜品。如果是活动，请说明在做什么。用中文简洁回答。', modelName = DEFAULT_MODEL) {
  const config = MODEL_CONFIGS[modelName];
  if (!config) {
    throw new Error(`Unknown vision model: ${modelName}`);
  }

  // Validate API key is configured
  if (!config.apiKey) {
    throw new Error(`API key not configured for model ${modelName}. Set VISION_BAILIAN_API_KEY or VISION_ZHIPU_API_KEY in .env file.`);
  }

  const base64Image = imageToBase64(imagePath);
  const mimeType = getMimeType(imagePath);
  const dataUrl = `data:${mimeType};base64,${base64Image}`;

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: config.model,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { 
            type: 'image_url', 
            image_url: { url: dataUrl }
          }
        ]
      }],
      max_tokens: config.apiFormat === 'zhipu' ? 2048 : 1024
    });

    const url = new URL(`${config.baseUrl}/chat/completions`);
    
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            reject(new Error(`Vision API error: ${json.error.message || JSON.stringify(json.error)}`));
          } else if (json.choices && json.choices[0]) {
            resolve(json.choices[0].message.content.trim());
          } else {
            reject(new Error('Unexpected API response format'));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}. Raw: ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`API request failed: ${err.message}`));
    });

    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error('API request timeout (60s)'));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Analyze food image specifically
 * @param {string} imagePath - Local path to image
 * @param {string} modelName - Model to use
 * @returns {Promise<string>} - Food description
 */
async function analyzeFood(imagePath, modelName = DEFAULT_MODEL) {
  const prompt = '请识别这张图片中的食物。说明是什么菜品/食物，有什么主要食材。如果是多道菜，请分别说明。用中文简洁回答，50 字以内。';
  return analyzeImage(imagePath, prompt, modelName);
}

/**
 * Analyze activity/exercise image
 * @param {string} imagePath - Local path to image
 * @param {string} modelName - Model to use
 * @returns {Promise<string>} - Activity description
 */
async function analyzeActivity(imagePath, modelName = DEFAULT_MODEL) {
  const prompt = '请描述这张图片中的活动或运动。说明是什么类型的活动，有什么特点。用中文简洁回答，50 字以内。';
  return analyzeImage(imagePath, prompt, modelName);
}

/**
 * Smart analysis - auto-detect image type
 * @param {string} imagePath - Local path to image
 * @param {string} context - Optional context (e.g., habit name)
 * @param {string} modelName - Model to use
 * @returns {Promise<string>} - Analysis result
 */
async function smartAnalyze(imagePath, context = '', modelName = DEFAULT_MODEL) {
  let prompt = '请描述这张图片的内容。';
  
  // Add context hints based on habit name
  if (context) {
    const contextLower = context.toLowerCase();
    if (contextLower.includes('早餐') || contextLower.includes('午餐') || contextLower.includes('晚餐') || contextLower.includes('饭')) {
      prompt = '请识别这张图片中的食物。说明是什么菜品/食物，有什么主要食材。用中文简洁回答，50 字以内。';
    } else if (contextLower.includes('站桩') || contextLower.includes('运动') || contextLower.includes('健身') || contextLower.includes('锻炼')) {
      prompt = '请描述这张图片中的运动或活动。说明是什么类型的活动。用中文简洁回答，50 字以内。';
    } else if (contextLower.includes('阅读') || contextLower.includes('学习') || contextLower.includes('工作')) {
      prompt = '请描述这张图片中的学习或工作内容。用中文简洁回答，50 字以内。';
    }
  }
  
  return analyzeImage(imagePath, prompt, modelName);
}

/**
 * Get list of available vision models
 * @returns {string[]} - Available model names
 */
function getAvailableModels() {
  return Object.keys(MODEL_CONFIGS);
}

// CLI test mode
if (require.main === module) {
  const imagePath = process.argv[2];
  const modelName = process.argv[3] || DEFAULT_MODEL;
  
  if (!imagePath || !fs.existsSync(imagePath)) {
    console.log('Usage: node vision.js <image_path> [model_name]');
    console.log('Available models:', getAvailableModels().join(', '));
    process.exit(1);
  }
  
  console.log(`Analyzing ${imagePath} with ${modelName}...`);
  
  smartAnalyze(imagePath, '早餐', modelName)
    .then(result => {
      console.log('\n✅ 识别结果:');
      console.log(result);
    })
    .catch(err => {
      console.error('❌ Error:', err.message);
      process.exit(1);
    });
}

module.exports = { 
  analyzeImage, 
  analyzeFood, 
  analyzeActivity, 
  smartAnalyze,
  getAvailableModels,
  DEFAULT_MODEL,
  MODEL_CONFIGS
};
