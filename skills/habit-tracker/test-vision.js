// Test script for vision.js
const path = require('path');
const fs = require('fs');
const { smartAnalyze, getAvailableModels, analyzeFood } = require('./scripts/vision');

async function runTests() {
  console.log('🧪 Vision Module Tests\n');
  console.log('Available models:', getAvailableModels().join(', '));
  console.log('');
  
  // Check if test image exists
  const testImage = path.join(__dirname, 'data', 'images', 'test-food.jpg');
  
  if (!fs.existsSync(testImage)) {
    console.log('⚠️  No test image found at:', testImage);
    console.log('\nTo test, place a food image at:');
    console.log('  data/images/test-food.jpg');
    console.log('\nThen run: node test-vision.js');
    return;
  }
  
  console.log('📷 Test image found:', testImage);
  console.log('');
  
  // Test 1: Food analysis
  console.log('Test 1: Food Analysis');
  console.log('─────────────────────');
  try {
    const result = await analyzeFood(testImage);
    console.log('✅ Success:', result);
  } catch (err) {
    console.log('❌ Error:', err.message);
  }
  console.log('');
  
  // Test 2: Smart analysis with context
  console.log('Test 2: Smart Analysis (早餐 context)');
  console.log('──────────────────────────────────────');
  try {
    const result = await smartAnalyze(testImage, '早餐');
    console.log('✅ Success:', result);
  } catch (err) {
    console.log('❌ Error:', err.message);
  }
  console.log('');
  
  // Test 3: Different models
  console.log('Test 3: Model Comparison');
  console.log('────────────────────────');
  const models = getAvailableModels();
  for (const model of models) {
    console.log(`\nTesting ${model}...`);
    try {
      const result = await smartAnalyze(testImage, '食物', model);
      console.log(`✅ ${model}: ${result.substring(0, 50)}...`);
    } catch (err) {
      console.log(`❌ ${model}: ${err.message}`);
    }
  }
}

runTests().catch(console.error);
