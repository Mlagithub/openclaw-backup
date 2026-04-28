#!/usr/bin/env node
// Phase 4 Database Migration Script
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'cards.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

console.log('Starting Phase 4 Migration...');
console.log('Database:', DB_PATH);

const db = new Database(DB_PATH);

try {
  // 1. Create daily_progress table
  console.log('Creating daily_progress table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_progress (
      date TEXT PRIMARY KEY,
      new_count INTEGER DEFAULT 0,
      review_count INTEGER DEFAULT 0,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Create deck_limits table
  console.log('Creating deck_limits table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS deck_limits (
      deck_id INTEGER PRIMARY KEY,
      new_limit INTEGER,
      review_limit INTEGER,
      new_limit_today INTEGER,
      review_limit_today INTEGER,
      new_cards_ignore_review_limit BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
    )
  `);

  // 3. Create template_fields table
  console.log('Creating template_fields table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS template_fields (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL,
      field_name TEXT NOT NULL,
      field_order INTEGER DEFAULT 0,
      field_type TEXT DEFAULT 'text',
      is_required BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (template_id) REFERENCES card_templates(id) ON DELETE CASCADE,
      UNIQUE(template_id, field_name)
    )
  `);

  // 4. Extend settings table (add columns if they don't exist)
  console.log('Extending settings table...');
  try {
    db.exec("ALTER TABLE settings ADD COLUMN daily_new_limit INTEGER DEFAULT 20");
  } catch (e) {
    console.log('  daily_new_limit column may already exist');
  }
  
  try {
    db.exec("ALTER TABLE settings ADD COLUMN daily_review_limit INTEGER DEFAULT 9999");
  } catch (e) {
    console.log('  daily_review_limit column may already exist');
  }
  
  try {
    db.exec("ALTER TABLE settings ADD COLUMN new_cards_ignore_review_limit BOOLEAN DEFAULT FALSE");
  } catch (e) {
    console.log('  new_cards_ignore_review_limit column may already exist');
  }

  // 5. Extend decks table
  console.log('Extending decks table...');
  try {
    db.exec("ALTER TABLE decks ADD COLUMN default_template_id INTEGER REFERENCES card_templates(id)");
  } catch (e) {
    console.log('  default_template_id column may already exist');
  }

  // 6. Extend cards table
  console.log('Extending cards table...');
  try {
    db.exec("ALTER TABLE cards ADD COLUMN template_id INTEGER REFERENCES card_templates(id)");
  } catch (e) {
    console.log('  template_id column may already exist');
  }
  
  try {
    db.exec("ALTER TABLE cards ADD COLUMN queue_position INTEGER DEFAULT 0");
  } catch (e) {
    console.log('  queue_position column may already exist');
  }
  
  try {
    db.exec("ALTER TABLE cards ADD COLUMN buried_until DATE");
  } catch (e) {
    console.log('  buried_until column may already exist');
  }

  // 7. Extend card_templates table
  console.log('Extending card_templates table...');
  try {
    db.exec("ALTER TABLE card_templates ADD COLUMN fields_json TEXT");
  } catch (e) {
    console.log('  fields_json column may already exist');
  }
  
  try {
    db.exec("ALTER TABLE card_templates ADD COLUMN is_cloze BOOLEAN DEFAULT FALSE");
  } catch (e) {
    console.log('  is_cloze column may already exist');
  }
  
  try {
    db.exec("ALTER TABLE card_templates ADD COLUMN generate_reverse BOOLEAN DEFAULT FALSE");
  } catch (e) {
    console.log('  generate_reverse column may already exist');
  }

  // 8. Create indexes
  console.log('Creating indexes...');
  db.exec("CREATE INDEX IF NOT EXISTS idx_daily_progress_date ON daily_progress(date)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_deck_limits_deck_id ON deck_limits(deck_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_cards_queue_position ON cards(queue_position)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_cards_buried_until ON cards(buried_until)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_template_fields_template_id ON template_fields(template_id)");

  // 9. Migrate existing templates to new format
  console.log('Migrating existing templates...');
  db.exec(`UPDATE card_templates SET fields_json = '["question", "answer"]' WHERE fields_json IS NULL`);
  db.exec(`UPDATE card_templates SET is_cloze = FALSE WHERE is_cloze IS NULL`);
  db.exec(`UPDATE card_templates SET generate_reverse = (type = 'basic-reverse') WHERE generate_reverse IS NULL`);

  // 10. Insert field definitions for existing templates
  console.log('Creating field definitions...');
  db.exec(`
    INSERT OR IGNORE INTO template_fields (template_id, field_name, field_order, field_type, is_required)
    SELECT id, 'question', 0, 'text', TRUE FROM card_templates
  `);
  db.exec(`
    INSERT OR IGNORE INTO template_fields (template_id, field_name, field_order, field_type, is_required)
    SELECT id, 'answer', 1, 'text', TRUE FROM card_templates
  `);

  // 11. Initialize default settings
  console.log('Initializing default settings...');
  db.exec(`
    INSERT OR IGNORE INTO settings (key, value) VALUES ('daily_new_limit', '20')
  `);
  db.exec(`
    INSERT OR IGNORE INTO settings (key, value) VALUES ('daily_review_limit', '9999')
  `);
  db.exec(`
    INSERT OR IGNORE INTO settings (key, value) VALUES ('new_cards_ignore_review_limit', '0')
  `);

  console.log('\n✅ Phase 4 Migration Complete!');
  console.log('\nNew features:');
  console.log('  - Daily card limits (new/review)');
  console.log('  - Deck-specific limit overrides');
  console.log('  - Daily progress tracking');
  console.log('  - Enhanced template system');
  console.log('  - Template field definitions');
  console.log('  - 6 predefined templates');
  
} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  process.exit(1);
} finally {
  db.close();
}
