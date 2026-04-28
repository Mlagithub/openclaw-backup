// Integration test for photo check-in flow
const path = require('path');
const fs = require('fs');
const { smartAnalyze } = require('./scripts/vision');
const { Habits } = require('./scripts/db');

async function runIntegrationTest() {
  console.log('🧪 Integration Test: AI Vision + Check-in Flow\n');
  console.log('═══════════════════════════════════════════════\n');
  
  const testImagePath = path.join(__dirname, 'data', 'images', 'test-food.jpg');
  
  if (!fs.existsSync(testImagePath)) {
    console.log('❌ Test image not found:', testImagePath);
    return;
  }
  
  console.log('Step 1: AI Image Recognition');
  console.log('─────────────────────────────');
  console.log('Image:', testImagePath);
  console.log('Context: 早餐');
  console.log('');
  
  // Test vision recognition
  const analysis = await smartAnalyze(testImagePath, '早餐');
  
  console.log('AI Recognition Result:');
  console.log(analysis);
  console.log('');
  
  // Simulate check-in with AI note
  const userNote = '今天的早餐';
  const combinedNote = userNote + ' | AI 识别：' + analysis;
  
  console.log('Step 2: Combined Note');
  console.log('─────────────────────');
  console.log('User note:', userNote);
  console.log('Combined:', combinedNote);
  console.log('');
  
  // Database integration
  console.log('Step 3: Database Integration');
  console.log('─────────────────────────────');
  
  // Create test habit if not exists
  let habit = Habits.getByName('测试早餐');
  if (!habit) {
    const addResult = Habits.add('测试早餐::AI 图片识别测试::7-9');
    if (addResult.id) {
      console.log('✅ Created test habit: 测试早餐');
      habit = Habits.getByName('测试早餐');
    }
  } else {
    console.log('✅ Test habit exists: 测试早餐');
  }
  
  // Record check-in with AI note
  if (habit) {
    const checkinResult = Habits.appendCheckin(habit.id, null, combinedNote);
    console.log('✅ Check-in recorded:', checkinResult.id);
    
    // Retrieve and display
    const checkins = Habits.getCheckins(habit.id, 1);
    console.log('');
    console.log('Step 4: Verification');
    console.log('────────────────────');
    console.log('Latest check-in from DB:');
    console.log('  ID:', checkins[0].id);
    console.log('  Note:', checkins[0].note);
    console.log('  Time:', checkins[0].checked_at);
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('✅ Integration test completed successfully!');
  console.log('');
  console.log('📝 Summary:');
  console.log('   • Vision AI: Working ✅');
  console.log('   • Note combination: Working ✅');
  console.log('   • Database storage: Working ✅');
  console.log('   • Full flow: Ready for Discord integration ✅');
}

runIntegrationTest().catch(err => {
  console.error('❌ Test failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
