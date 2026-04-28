const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'cards.db');
const db = new Database(DB_PATH);

console.log('Running Phase 3 migrations...');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// 1. Media files table
db.exec(`
  CREATE TABLE IF NOT EXISTS media_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT UNIQUE NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_hash TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    card_id INTEGER,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE SET NULL
  )
`);
console.log('✓ Created media_files table');

// 2. Card templates table
db.exec(`
  CREATE TABLE IF NOT EXISTS card_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL DEFAULT 'basic',
    front_template TEXT NOT NULL,
    back_template TEXT NOT NULL,
    css TEXT DEFAULT '',
    is_default INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('✓ Created card_templates table');

// 3. Deck templates association table
db.exec(`
  CREATE TABLE IF NOT EXISTS deck_templates (
    deck_id INTEGER NOT NULL,
    template_id INTEGER NOT NULL,
    PRIMARY KEY (deck_id, template_id),
    FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES card_templates(id) ON DELETE CASCADE
  )
`);
console.log('✓ Created deck_templates table');

// 4. Review logs table for statistics
db.exec(`
  CREATE TABLE IF NOT EXISTS review_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    rating INTEGER NOT NULL,
    interval REAL NOT NULL,
    ease_factor REAL NOT NULL,
    reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
  )
`);
console.log('✓ Created review_logs table');

// 5. Create indexes for performance
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_media_card ON media_files(card_id);
  CREATE INDEX IF NOT EXISTS idx_review_logs_date ON review_logs(date(reviewed_at));
  CREATE INDEX IF NOT EXISTS idx_review_logs_card ON review_logs(card_id);
`);
console.log('✓ Created indexes');

// 6. Insert default templates
const defaultTemplates = [
  {
    name: '基础卡',
    type: 'basic',
    front: '{{question}}',
    back: '{{question}}\n<hr id="answer">\n{{answer}}',
    css: '.card {\n  font-family: Arial, sans-serif;\n  font-size: 20px;\n  text-align: center;\n}\n.card img {\n  max-width: 100%;\n  height: auto;\n}'
  },
  {
    name: '反向卡',
    type: 'reverse',
    front: '{{question}}',
    back: '{{question}}\n<hr id="answer">\n{{answer}}',
    css: '.card {\n  font-family: Arial, sans-serif;\n  font-size: 20px;\n  text-align: center;\n}'
  },
  {
    name: '填空卡',
    type: 'cloze',
    front: '{{cloze}}',
    back: '{{cloze}}\n<hr id="answer">\n{{answer}}',
    css: '.card {\n  font-family: Arial, sans-serif;\n  font-size: 20px;\n}\n.cloze {\n  color: #1a73e8;\n  font-weight: bold;\n}'
  }
];

for (const tmpl of defaultTemplates) {
  const exists = db.prepare('SELECT id FROM card_templates WHERE name = ?').get(tmpl.name);
  if (!exists) {
    db.prepare(`
      INSERT INTO card_templates (name, type, front_template, back_template, css, is_default)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(tmpl.name, tmpl.type, tmpl.front, tmpl.back, tmpl.css, tmpl.name === '基础卡' ? 1 : 0);
    console.log(`✓ Inserted default template: ${tmpl.name}`);
  }
}

// 7. Add template_id to cards table (optional, for template-specific cards)
try {
  db.exec(`
    ALTER TABLE cards ADD COLUMN template_id INTEGER DEFAULT 1
  `);
  console.log('✓ Added template_id to cards table');
} catch (e) {
  if (!e.message.includes('duplicate')) {
    throw e;
  }
  console.log('✓ template_id column already exists');
}

// 8. Add tags to cards table
try {
  db.exec(`ALTER TABLE cards ADD COLUMN tags TEXT DEFAULT ''`);
  console.log('✓ Added tags to cards table');
} catch (e) {
  if (!e.message.includes('duplicate')) {
    throw e;
  }
  console.log('✓ tags column already exists');
}

console.log('\n✅ Phase 3 migrations completed!');
db.close();
