// scripts/image-handler.js - Handle photo check-ins with AI recognition

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { Habits } = require('./db');
const { smartAnalyze, DEFAULT_MODEL } = require('./vision');

// Config
const IMAGES_DIR = path.join(__dirname, '..', 'data', 'images');
const DISCORD_TOKEN = process.env.DISCORD_TOKEN || '';

// Ensure images directory exists
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

/**
 * Download image from Discord URL
 * @param {string} url - Discord image URL
 * @param {string} filename - Target filename
 * @returns {Promise<string>} - Saved filename
 */
async function downloadDiscordImage(url, filename) {
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
 * Analyze image with Vision AI
 * @param {string} imagePath - Local path to image
 * @param {string} context - Context hint (habit name)
 * @returns {Promise<object>} - Analysis result
 */
async function analyzeImage(imagePath, context = '') {
  try {
    const analysis = await smartAnalyze(imagePath, context, DEFAULT_MODEL);
    return {
      success: true,
      description: analysis,
      model: DEFAULT_MODEL
    };
  } catch (error) {
    console.error('Vision analysis error:', error.message);
    return {
      success: false,
      error: error.message,
      description: null
    };
  }
}

/**
 * Handle photo check-in with AI recognition
 * @param {object} attachment - Discord attachment object
 * @param {string} habitName - Name of the habit
 * @param {string} userNote - Optional user-provided note
 * @returns {Promise<object>} - Result with success status, image path, and AI analysis
 */
async function handlePhotoCheckin(attachment, habitName, userNote = '') {
  try {
    const timestamp = Date.now();
    const ext = path.extname(attachment.url.split('?')[0]) || '.jpg';
    // Sanitize filename: replace special characters with underscore
    const safeHabitName = habitName.replace(/[/\\:*?"<>|]/g, '_');
    const filename = `${safeHabitName}_${timestamp}${ext}`;
    
    // Download image from Discord
    const imageUrl = attachment.url;
    await downloadDiscordImage(imageUrl, filename);
    
    const localPath = path.join(IMAGES_DIR, filename);
    
    // Analyze with AI
    const analysis = await analyzeImage(localPath, habitName);
    
    // Combine user note with AI analysis
    let finalNote = userNote || '';
    if (analysis.success && analysis.description) {
      if (finalNote) {
        finalNote += ` | AI 识别：${analysis.description}`;
      } else {
        finalNote = `AI 识别：${analysis.description}`;
      }
    }
    
    return {
      success: true,
      imagePath: `/data/images/${filename}`,
      localPath: localPath,
      filename: filename,
      analysis: analysis,
      note: finalNote
    };
  } catch (error) {
    console.error('Error handling photo:', error);
    return { 
      success: false, 
      error: error.message,
      note: userNote || `[图片下载失败：${error.message}]`
    };
  }
}

/**
 * Handle multiple photo attachments
 * @param {Array} attachments - Discord attachments array
 * @param {string} habitName - Name of the habit
 * @param {string} userNote - Optional user-provided note
 * @returns {Promise<object>} - Combined result
 */
async function handleMultiplePhotos(attachments, habitName, userNote = '') {
  const results = [];
  const imagePaths = [];
  const aiDescriptions = [];
  
  for (const attachment of attachments) {
    if (attachment.url && attachment.url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      const result = await handlePhotoCheckin(attachment, habitName, '');
      if (result.success) {
        results.push(result);
        imagePaths.push(result.filename);
        if (result.analysis?.success && result.analysis.description) {
          aiDescriptions.push(result.analysis.description);
        }
      }
    }
  }
  
  // Combine all AI descriptions
  let combinedNote = userNote || '';
  if (aiDescriptions.length > 0) {
    const aiText = aiDescriptions.join('; ');
    if (combinedNote) {
      combinedNote += ` | AI 识别：${aiText}`;
    } else {
      combinedNote = `AI 识别：${aiText}`;
    }
  }
  
  return {
    success: results.length > 0,
    count: results.length,
    imagePaths: imagePaths,
    note: combinedNote,
    details: results
  };
}

module.exports = { 
  handlePhotoCheckin, 
  handleMultiplePhotos,
  downloadDiscordImage, 
  analyzeImage 
};
