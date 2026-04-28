// test/api.test.js - API Tests for FSRS Web UI

const assert = require('assert');
const http = require('http');

const BASE_URL = 'http://localhost:3001';

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Running FSRS Web UI API Tests\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Get stats
  console.log('Test 1: Get statistics...');
  try {
    const res = await request('GET', '/api/stats');
    assert.strictEqual(res.status, 200, 'Status should be 200');
    assert.strictEqual(res.data.success, true, 'Success should be true');
    assert.ok(res.data.data.total >= 0, 'Total should be >= 0');
    console.log('  ✅ PASSED\n');
    passed++;
  } catch (e) {
    console.log(`  ❌ FAILED: ${e.message}\n`);
    failed++;
  }
  
  // Test 2: Get all cards
  console.log('Test 2: Get all cards...');
  try {
    const res = await request('GET', '/api/cards');
    assert.strictEqual(res.status, 200, 'Status should be 200');
    assert.strictEqual(res.data.success, true, 'Success should be true');
    assert.ok(Array.isArray(res.data.data), 'Cards should be an array');
    console.log(`  ✅ PASSED (${res.data.data.length} cards)\n`);
    passed++;
  } catch (e) {
    console.log(`  ❌ FAILED: ${e.message}\n`);
    failed++;
  }
  
  // Test 3: Get due cards
  console.log('Test 3: Get due cards...');
  try {
    const res = await request('GET', '/api/cards/due');
    assert.strictEqual(res.status, 200, 'Status should be 200');
    assert.strictEqual(res.data.success, true, 'Success should be true');
    assert.ok(Array.isArray(res.data.data), 'Due cards should be an array');
    console.log(`  ✅ PASSED (${res.data.data.length} due cards)\n`);
    passed++;
  } catch (e) {
    console.log(`  ❌ FAILED: ${e.message}\n`);
    failed++;
  }
  
  // Test 4: Add a new card
  console.log('Test 4: Add new card...');
  const testQuestion = 'Test Question ' + Date.now();
  const testAnswer = 'Test Answer';
  try {
    const res = await request('POST', '/api/cards', { 
      question: testQuestion, 
      answer: testAnswer 
    });
    assert.strictEqual(res.status, 200, 'Status should be 200');
    assert.strictEqual(res.data.success, true, 'Success should be true');
    assert.strictEqual(res.data.data.question, testQuestion, 'Question should match');
    console.log(`  ✅ PASSED (card #${res.data.data.id})\n`);
    passed++;
    
    // Test 5: Get single card
    console.log('Test 5: Get single card...');
    const cardId = res.data.data.id;
    const cardRes = await request('GET', `/api/cards/${cardId}`);
    assert.strictEqual(cardRes.status, 200, 'Status should be 200');
    assert.strictEqual(cardRes.data.data.id, cardId, 'Card ID should match');
    console.log('  ✅ PASSED\n');
    passed++;
    
    // Test 6: Delete the test card
    console.log('Test 6: Delete card...');
    const deleteRes = await request('DELETE', `/api/cards/${cardId}`);
    assert.strictEqual(deleteRes.status, 200, 'Status should be 200');
    console.log('  ✅ PASSED\n');
    passed++;
    
  } catch (e) {
    console.log(`  ❌ FAILED: ${e.message}\n`);
    failed++;
  }
  
  // Test 7: Add card validation
  console.log('Test 7: Validation - missing question...');
  try {
    const res = await request('POST', '/api/cards', { answer: 'test' });
    assert.strictEqual(res.status, 400, 'Status should be 400');
    console.log('  ✅ PASSED\n');
    passed++;
  } catch (e) {
    console.log(`  ❌ FAILED: ${e.message}\n`);
    failed++;
  }
  
  // Test 8: Review card
  console.log('Test 8: Review card with rating...');
  try {
    // Get first due card
    const dueRes = await request('GET', '/api/cards/due');
    if (dueRes.data.data.length > 0) {
      const cardId = dueRes.data.data[0].id;
      const reviewRes = await request('POST', `/api/review/${cardId}`, { rating: 3 });
      assert.strictEqual(reviewRes.status, 200, 'Status should be 200');
      assert.strictEqual(reviewRes.data.success, true, 'Success should be true');
      console.log('  ✅ PASSED\n');
      passed++;
    } else {
      console.log('  ⏭️  SKIPPED (no due cards)\n');
    }
  } catch (e) {
    console.log(`  ❌ FAILED: ${e.message}\n`);
    failed++;
  }
  
  // Summary
  console.log('═══════════════════════════════════════');
  console.log(`📊 Results: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════');
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);
