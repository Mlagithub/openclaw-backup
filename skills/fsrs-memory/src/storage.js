// storage.js - SQLite based storage for FSRS cards with multi-deck support
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'cards.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH);

// Create tables with multi-deck support
db.exec(`
  -- Decks table
  CREATE TABLE IF NOT EXISTS decks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  -- Cards table with deck reference
  CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deck_id INTEGER DEFAULT 1,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    due_date DATETIME,
    interval REAL DEFAULT 0,
    ease_factor REAL DEFAULT 2.5,
    repetitions INTEGER DEFAULT 0,
    lapses INTEGER DEFAULT 0,
    state TEXT DEFAULT 'new',
    last_review DATETIME,
    FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
  );
  
  -- Settings table for theme and preferences
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
  
  CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards(deck_id);
  CREATE INDEX IF NOT EXISTS idx_cards_due_date ON cards(due_date);
`);

// Create default deck if not exists
const defaultDeck = db.prepare('SELECT * FROM decks WHERE id = 1').get();
if (!defaultDeck) {
  db.prepare('INSERT INTO decks (id, name, description) VALUES (1, ?, ?, ?)').run('默认牌组', '默认学习牌组', '2024-01-01');
}

// Initialize default settings
const themeSetting = db.prepare('SELECT * FROM settings WHERE key = ?').get('theme');
if (!themeSetting) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('theme', 'light');
}

// Storage operations
const Storage = {
  // ==================== Deck Operations ====================
  
  // Get all decks
  getAllDecks() {
    const stmt = db.prepare(`
      SELECT d.*, 
        (SELECT COUNT(*) FROM cards WHERE deck_id = d.id) as card_count,
        (SELECT COUNT(*) FROM cards WHERE deck_id = d.id AND due_date <= datetime('now')) as due_count
      FROM decks d 
      ORDER BY d.id ASC
    `);
    return stmt.all();
  },
  
  // Get deck by ID
  getDeck(id) {
    const stmt = db.prepare('SELECT * FROM decks WHERE id = ?');
    return stmt.get(id);
  },
  
  // Create new deck
  createDeck(name, description = '') {
    try {
      const stmt = db.prepare('INSERT INTO decks (name, description) VALUES (?, ?)');
      const result = stmt.run(name, description);
      return { id: result.lastInsertRowid, name, description };
    } catch (error) {
      if (error.message.includes('UNIQUE')) {
        throw new Error('牌组名称已存在');
      }
      throw error;
    }
  },
  
  // Update deck
  updateDeck(id, name, description) {
    const stmt = db.prepare(`
      UPDATE decks SET name = ?, description = ?, updated_at = datetime('now') WHERE id = ?
    `);
    return stmt.run(name, description, id);
  },
  
  // Delete deck
  deleteDeck(id) {
    if (id === 1) {
      throw new Error('无法删除默认牌组');
    }
    const stmt = db.prepare('DELETE FROM decks WHERE id = ?');
    return stmt.run(id);
  },
  
  // ==================== Card Operations ====================
  
  // Add a new card (optionally to specific deck)
  addCard(question, answer, deckId = 1) {
    const now = new Date();
    const stmt = db.prepare(`
      INSERT INTO cards (deck_id, question, answer, due_date, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(deckId, question, answer, now.toISOString(), now.toISOString());
    return result.lastInsertRowid;
  },
  
  // Get all cards (optionally filtered by deck)
  getAllCards(deckId = null) {
    let query = 'SELECT * FROM cards';
    const params = [];
    if (deckId !== null) {
      query += ' WHERE deck_id = ?';
      params.push(deckId);
    }
    query += ' ORDER BY created_at DESC';
    const stmt = db.prepare(query);
    return stmt.all(...params);
  },
  
  // Get card by ID
  getCard(id) {
    const stmt = db.prepare('SELECT * FROM cards WHERE id = ?');
    return stmt.get(id);
  },
  
  // Get due cards (optionally filtered by deck)
  getDueCards(deckId = null) {
    const now = new Date().toISOString();
    let query = 'SELECT * FROM cards WHERE due_date <= ?';
    const params = [now];
    if (deckId !== null) {
      query += ' AND deck_id = ?';
      params.push(deckId);
    }
    query += ' ORDER BY due_date ASC';
    const stmt = db.prepare(query);
    return stmt.all(...params);
  },
  
  // Update card after review
  updateCard(id, data) {
    const stmt = db.prepare(`
      UPDATE cards SET
        due_date = ?,
        interval = ?,
        ease_factor = ?,
        repetitions = ?,
        lapses = ?,
        state = ?,
        last_review = ?
      WHERE id = ?
    `);
    return stmt.run(
      data.due_date,
      data.interval,
      data.ease_factor,
      data.repetitions,
      data.lapses,
      data.state,
      data.last_review,
      id
    );
  },
  
  // Delete card
  deleteCard(id) {
    const stmt = db.prepare('DELETE FROM cards WHERE id = ?');
    return stmt.run(id);
  },
  
  // Move card to different deck
  moveCard(cardId, newDeckId) {
    const stmt = db.prepare('UPDATE cards SET deck_id = ? WHERE id = ?');
    return stmt.run(newDeckId, cardId);
  },
  
  // ==================== Statistics ====================
  
  // Get total count (optionally by deck)
  getTotalCount(deckId = null) {
    let query = 'SELECT COUNT(*) as count FROM cards';
    const params = [];
    if (deckId !== null) {
      query += ' WHERE deck_id = ?';
      params.push(deckId);
    }
    const stmt = db.prepare(query);
    return stmt.get(...params).count;
  },
  
  // Get due count (optionally by deck)
  getDueCount(deckId = null) {
    const now = new Date().toISOString();
    let query = 'SELECT COUNT(*) as count FROM cards WHERE due_date <= ?';
    const params = [now];
    if (deckId !== null) {
      query += ' AND deck_id = ?';
      params.push(deckId);
    }
    const stmt = db.prepare(query);
    return stmt.get(...params).count;
  },
  
  // Get reviewed count (optionally by deck)
  getReviewedCount(deckId = null) {
    let query = 'SELECT COUNT(*) as count FROM cards WHERE repetitions > 0';
    const params = [];
    if (deckId !== null) {
      query += ' AND deck_id = ?';
      params.push(deckId);
    }
    const stmt = db.prepare(query);
    return stmt.get(...params).count;
  },
  
  // Get new cards count (optionally by deck)
  getNewCount(deckId = null) {
    let query = "SELECT COUNT(*) as count FROM cards WHERE state = 'new' OR repetitions = 0";
    const params = [];
    if (deckId !== null) {
      query += ' AND deck_id = ?';
      params.push(deckId);
    }
    const stmt = db.prepare(query);
    return stmt.get(...params).count;
  },
  
  // Get learning cards count (optionally by deck)
  getLearningCount(deckId = null) {
    let query = "SELECT COUNT(*) as count FROM cards WHERE state = 'learning' OR state = 'relearning'";
    const params = [];
    if (deckId !== null) {
      query += ' AND deck_id = ?';
      params.push(deckId);
    }
    const stmt = db.prepare(query);
    return stmt.get(...params).count;
  },
  
  // Get average ease factor (optionally by deck)
  getAvgEase(deckId = null) {
    let query = 'SELECT AVG(ease_factor) as avg FROM cards WHERE repetitions > 0';
    const params = [];
    if (deckId !== null) {
      query += ' AND deck_id = ?';
      params.push(deckId);
    }
    const stmt = db.prepare(query);
    return (stmt.get(...params).avg || 2.5);
  },
  
  // ==================== Settings ====================
  
  // Get setting value
  getSetting(key) {
    const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
    const result = stmt.get(key);
    return result ? result.value : null;
  },
  
  // Set setting value
  setSetting(key, value) {
    const stmt = db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    return stmt.run(key, value);
  }
};

module.exports = Storage;
