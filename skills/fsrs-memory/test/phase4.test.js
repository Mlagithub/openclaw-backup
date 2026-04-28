// Phase 4 Test Suite - Daily Limits & Template Enhancements
const db = require('better-sqlite3')('../data/cards.db');
const dailyLimits = require('../src/daily-limits');
const templateManager = require('../src/template-manager');

console.log('=== Phase 4 Test Suite ===\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

// ==================== Daily Limits Tests ====================
console.log('\n--- Daily Limits Tests ---\n');

test('Get global limits (defaults)', () => {
  const limits = dailyLimits.getGlobalLimits();
  if (limits.daily_new_limit !== 20) throw new Error(`Expected 20, got ${limits.daily_new_limit}`);
  if (limits.daily_review_limit !== 9999) throw new Error(`Expected 9999, got ${limits.daily_review_limit}`);
});

test('Update global limits', () => {
  const newLimits = dailyLimits.setGlobalLimits({
    daily_new_limit: 25,
    daily_review_limit: 500
  });
  if (newLimits.daily_new_limit !== 25) throw new Error('Failed to update new limit');
  if (newLimits.daily_review_limit !== 500) throw new Error('Failed to update review limit');
});

test('Get deck limits (uses global when no deck-specific)', () => {
  const limits = dailyLimits.getDeckLimits(1);
  if (limits.effective_new_limit !== 25) throw new Error('Should use global limit');
});

test('Set deck-specific limits', () => {
  const limits = dailyLimits.setDeckLimits(1, {
    new_limit: 15,
    review_limit: 300
  });
  if (limits.effective_new_limit !== 15) throw new Error('Deck limit not set');
  if (limits.new_limit !== 15) throw new Error('Deck limit not stored');
});

test('Get today progress', () => {
  const progress = dailyLimits.getTodayProgress();
  if (!progress.date) throw new Error('No date in progress');
  if (progress.new_count === undefined) throw new Error('No new_count in progress');
});

test('Increment progress', () => {
  const before = dailyLimits.getTodayProgress();
  dailyLimits.incrementProgress('new');
  const after = dailyLimits.getTodayProgress();
  if (after.new_count <= before.new_count) throw new Error('Progress not incremented');
});

test('Get today cards queue', () => {
  const queue = dailyLimits.getTodaysCards();
  if (!queue.new_cards) throw new Error('No new_cards in queue');
  if (!queue.review_cards) throw new Error('No review_cards in queue');
  if (!queue.limits) throw new Error('No limits in queue');
});

test('Reset daily progress', () => {
  const today = new Date().toISOString().split('T')[0];
  dailyLimits.resetProgress(today, { reset_new: true, reset_review: true });
  const progress = dailyLimits.getTodayProgress();
  if (progress.new_count !== 0) throw new Error('New count not reset');
  if (progress.review_count !== 0) throw new Error('Review count not reset');
});

// ==================== Template Tests ====================
console.log('\n--- Template Tests ---\n');

test('Get all templates', () => {
  const templates = templateManager.getAllTemplates();
  if (!Array.isArray(templates)) throw new Error('Templates not an array');
  if (templates.length === 0) throw new Error('No templates found');
});

test('Get template by ID', () => {
  const template = templateManager.getTemplate(1);
  if (!template) throw new Error('Template not found');
  if (!template.name) throw new Error('Template has no name');
});

test('Create new template', () => {
  const newTemplate = templateManager.createTemplate({
    name: 'Test Template',
    type: 'basic',
    front_template: '{{question}}',
    back_template: '{{FrontSide}}<hr>{{answer}}',
    css: '.card { color: red; }',
    fields: ['question', 'answer']
  });
  if (!newTemplate.id) throw new Error('Template not created');
  if (newTemplate.name !== 'Test Template') throw new Error('Template name mismatch');
});

test('Preview template', () => {
  const preview = templateManager.previewTemplate(1, {
    question: 'Test question',
    answer: 'Test answer'
  });
  if (!preview.front) throw new Error('No front in preview');
  if (!preview.back) throw new Error('No back in preview');
  if (!preview.front.includes('Test question')) throw new Error('Preview not rendering');
});

test('Clone template', () => {
  const cloned = templateManager.cloneTemplate(1, 'Cloned Template');
  if (!cloned.id) throw new Error('Clone failed');
  if (cloned.name !== 'Cloned Template') throw new Error('Clone name mismatch');
});

test('Export template', () => {
  const exported = templateManager.exportTemplate(1);
  if (!exported.name) throw new Error('Export failed');
  if (!exported.front_template) throw new Error('No front_template in export');
  if (!exported.version) throw new Error('No version in export');
});

test('Import template', () => {
  const imported = templateManager.importTemplate({
    name: 'Imported Template',
    type: 'basic',
    front_template: '{{front}}',
    back_template: '{{back}}',
    fields: [{name: 'front'}, {name: 'back'}]
  });
  if (!imported.id) throw new Error('Import failed');
});

test('Apply template to cards', () => {
  const result = templateManager.applyToCards(1, 1);
  if (result.updated_count === undefined) throw new Error('Apply failed');
});

test('Set deck template', () => {
  templateManager.setDeckTemplate(1, 1);
  const deck = db.prepare('SELECT default_template_id FROM decks WHERE id = 1').get();
  if (deck.default_template_id !== 1) throw new Error('Deck template not set');
});

// ==================== Cleanup ====================
console.log('\n--- Cleanup ---\n');

test('Delete test template', () => {
  const testTemplate = db.prepare("SELECT id FROM card_templates WHERE name = 'Test Template'").get();
  if (testTemplate) {
    templateManager.deleteTemplate(testTemplate.id);
  }
});

test('Delete cloned template', () => {
  const cloned = db.prepare("SELECT id FROM card_templates WHERE name = 'Cloned Template'").get();
  if (cloned) {
    templateManager.deleteTemplate(cloned.id);
  }
});

test('Delete imported template', () => {
  const imported = db.prepare("SELECT id FROM card_templates WHERE name = 'Imported Template'").get();
  if (imported) {
    templateManager.deleteTemplate(imported.id);
  }
});

// ==================== Summary ====================
console.log('\n=== Test Summary ===');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📊 Total: ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 All tests passed!');
}
