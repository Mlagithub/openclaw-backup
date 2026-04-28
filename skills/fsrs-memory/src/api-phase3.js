// Phase 3 API Extensions - Media, Templates, Export, Stats
const multer = require('multer');
const JSZip = require('jszip');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

module.exports = function setupPhase3API(app, db) {
  const MEDIA_DIR = path.join(__dirname, '..', 'web', 'media');
  const EXPORT_DIR = path.join(__dirname, '..', 'web', 'exports');
  
  // Ensure directories exist
  if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });
  if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });

  // ==================== Media API ====================
  
  // Setup multer for media uploads
  const mediaStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, MEDIA_DIR),
    filename: (req, file, cb) => {
      const hash = crypto.createHash('md5').update(Date.now() + file.originalname).digest('hex');
      const ext = path.extname(file.originalname);
      cb(null, hash + ext);
    }
  });
  
  const mediaUpload = multer({
    storage: mediaStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      const allowed = /jpeg|jpg|png|gif|webp|mp3|wav|ogg|m4a/;
      const ext = allowed.test(path.extname(file.originalname).toLowerCase());
      const mime = allowed.test(file.mimetype);
      if (ext || mime) return cb(null, true);
      cb(new Error('Invalid file type'));
    }
  });

  // Upload media file
  app.post('/api/media/upload', mediaUpload.single('file'), (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
      
      const stmt = db.prepare(`
        INSERT INTO media_files (filename, original_name, mime_type, file_size, file_hash)
        VALUES (?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        req.file.filename,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        crypto.createHash('md5').update(fs.readFileSync(req.file.path)).digest('hex')
      );
      
      const media = db.prepare('SELECT * FROM media_files WHERE id = ?').get(result.lastInsertRowid);
      res.json({ success: true, data: media, url: `/media/${media.filename}` });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get all media files
  app.get('/api/media', (req, res) => {
    try {
      const media = db.prepare('SELECT * FROM media_files ORDER BY uploaded_at DESC').all();
      res.json({ success: true, data: media });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Delete media file
  app.delete('/api/media/:id', (req, res) => {
    try {
      const media = db.prepare('SELECT * FROM media_files WHERE id = ?').get(req.params.id);
      if (!media) return res.status(404).json({ success: false, error: 'Media not found' });
      
      const filePath = path.join(MEDIA_DIR, media.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      
      db.prepare('DELETE FROM media_files WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Serve media files
  app.get('/media/:filename', (req, res) => {
    const filePath = path.join(MEDIA_DIR, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).send('Not found');
    res.sendFile(filePath);
  });

  // ==================== Template API ====================

  // Get all templates
  app.get('/api/templates', (req, res) => {
    try {
      const templates = db.prepare('SELECT * FROM card_templates ORDER BY id').all();
      res.json({ success: true, data: templates });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Create template
  app.post('/api/templates', (req, res) => {
    try {
      const { name, type, front_template, back_template, css } = req.body;
      if (!name || !front_template || !back_template) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }
      
      const stmt = db.prepare(`
        INSERT INTO card_templates (name, type, front_template, back_template, css)
        VALUES (?, ?, ?, ?, ?)
      `);
      const result = stmt.run(name, type || 'basic', front_template, back_template, css || '');
      
      const template = db.prepare('SELECT * FROM card_templates WHERE id = ?').get(result.lastInsertRowid);
      res.json({ success: true, data: template });
    } catch (error) {
      if (error.message.includes('UNIQUE')) {
        return res.status(400).json({ success: false, error: 'Template name already exists' });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Update template
  app.put('/api/templates/:id', (req, res) => {
    try {
      const { name, type, front_template, back_template, css } = req.body;
      db.prepare(`
        UPDATE card_templates 
        SET name = ?, type = ?, front_template = ?, back_template = ?, css = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(name, type, front_template, back_template, css, req.params.id);
      
      const template = db.prepare('SELECT * FROM card_templates WHERE id = ?').get(req.params.id);
      res.json({ success: true, data: template });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Delete template
  app.delete('/api/templates/:id', (req, res) => {
    try {
      const template = db.prepare('SELECT * FROM card_templates WHERE id = ?').get(req.params.id);
      if (!template) return res.status(404).json({ success: false, error: 'Template not found' });
      if (template.is_default) return res.status(400).json({ success: false, error: 'Cannot delete default template' });
      
      db.prepare('DELETE FROM card_templates WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Preview template rendering
  app.post('/api/templates/:id/preview', (req, res) => {
    try {
      const template = db.prepare('SELECT * FROM card_templates WHERE id = ?').get(req.params.id);
      if (!template) return res.status(404).json({ success: false, error: 'Template not found' });
      
      const { fields } = req.body; // { question: "...", answer: "..." }
      
      let front = template.front_template;
      let back = template.back_template;
      
      // Simple template rendering
      for (const [key, value] of Object.entries(fields || {})) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        front = front.replace(regex, value || '');
        back = back.replace(regex, value || '');
      }
      
      // Handle {{FrontSide}}
      back = back.replace(/{{FrontSide}}/g, front);
      
      res.json({ 
        success: true, 
        data: { front, back, css: template.css }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ==================== Export API ====================

  // Export cards
  app.post('/api/export', (req, res) => {
    try {
      const { format, deck_id } = req.body;
      if (!format || !['apkg', 'csv', 'json'].includes(format)) {
        return res.status(400).json({ success: false, error: 'Invalid format' });
      }
      
      const exportId = Date.now().toString();
      const exportPath = path.join(EXPORT_DIR, exportId);
      fs.mkdirSync(exportPath, { recursive: true });
      
      // Get cards
      let cards;
      if (deck_id) {
        cards = db.prepare('SELECT * FROM cards WHERE deck_id = ?').all(deck_id);
      } else {
        cards = db.prepare('SELECT * FROM cards').all();
      }
      
      // Get decks
      const decks = db.prepare('SELECT * FROM decks').all();
      
      // Get templates
      const templates = db.prepare('SELECT * FROM card_templates').all();
      
      let filePath;
      
      if (format === 'json') {
        filePath = path.join(exportPath, 'export.json');
        const data = {
          exported_at: new Date().toISOString(),
          version: '1.0',
          decks,
          templates,
          cards: cards.map(c => ({
            id: c.id,
            deck_id: c.deck_id,
            question: c.question,
            answer: c.answer,
            tags: c.tags,
            created_at: c.created_at
          }))
        };
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      } else if (format === 'csv') {
        filePath = path.join(exportPath, 'export.csv');
        const deckMap = Object.fromEntries(decks.map(d => [d.id, d.name]));
        let csv = 'id,deck,question,answer,tags,created_at\n';
        for (const card of cards) {
          const escape = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
          csv += [
            card.id,
            escape(deckMap[card.deck_id] || 'Default'),
            escape(card.question),
            escape(card.answer),
            escape(card.tags),
            escape(card.created_at)
          ].join(',') + '\n';
        }
        fs.writeFileSync(filePath, csv);
      } else if (format === 'apkg') {
        // Simplified APKG export
        filePath = path.join(exportPath, 'export.apkg');
        const zip = new JSZip();
        
        // Create minimal SQLite database
        const tempDb = require('better-sqlite3')(path.join(exportPath, 'temp.anki2'));
        tempDb.exec(`
          CREATE TABLE notes (id INTEGER PRIMARY KEY, guid TEXT, mid INTEGER, mod INTEGER, usn INTEGER, tags TEXT, flds TEXT);
          CREATE TABLE cards (id INTEGER PRIMARY KEY, nid INTEGER, did INTEGER, ord INTEGER, mod INTEGER, usn INTEGER, type INTEGER, queue INTEGER, due INTEGER, ivl INTEGER, factor INTEGER, reps INTEGER, lapses INTEGER, left INTEGER);
          CREATE TABLE decks (id INTEGER PRIMARY KEY, name TEXT);
          CREATE TABLE col (id INTEGER PRIMARY KEY, crt INTEGER, mod INTEGER, scm INTEGER, ver INTEGER, dty INTEGER, usn INTEGER, ls INTEGER, conf TEXT, models TEXT, decks TEXT, dconf TEXT, tags TEXT);
        `);
        
        // Insert notes
        const noteStmt = tempDb.prepare('INSERT INTO notes VALUES (?, ?, ?, ?, ?, ?, ?)');
        const cardStmt = tempDb.prepare('INSERT INTO cards VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        const deckStmt = tempDb.prepare('INSERT OR REPLACE INTO decks VALUES (?, ?)');
        
        for (const deck of decks) {
          deckStmt.run(deck.id, JSON.stringify({ name: deck.name }));
        }
        
        let noteId = 1;
        let cardId = 1;
        for (const card of cards) {
          const flds = `${card.question}\x1f${card.answer}`;
          noteStmt.run(noteId, `note-${noteId}`, 1, Date.now(), 0, card.tags || '', flds);
          
          cardStmt.run(
            cardId, noteId, card.deck_id, 0, Date.now(), 0,
            0, 0, Math.floor(Date.now() / 1000),
            card.interval || 0, Math.floor((card.ease_factor || 2.5) * 1000),
            card.repetitions || 0, card.lapses || 0, 0
          );
          noteId++;
          cardId++;
        }
        
        tempDb.close();
        
        // Add to ZIP
        zip.file('collection.anki2', fs.readFileSync(path.join(exportPath, 'temp.anki2')));
        zip.file('media', JSON.stringify({}));
        
        // Write ZIP
        zip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
          .pipe(fs.createWriteStream(filePath))
          .on('finish', () => {
            fs.unlinkSync(path.join(exportPath, 'temp.anki2'));
            res.json({ success: true, data: { exportId, format, count: cards.length } });
          });
        return; // Response sent in stream callback
      }
      
      res.json({ success: true, data: { exportId, format, count: cards.length } });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Download export file
  app.get('/api/export/:exportId/download', (req, res) => {
    try {
      const { exportId } = req.params;
      const { format } = req.query;
      
      const exportPath = path.join(EXPORT_DIR, exportId);
      if (!fs.existsSync(exportPath)) {
        return res.status(404).json({ success: false, error: 'Export not found' });
      }
      
      const ext = format === 'apkg' ? 'apkg' : format === 'csv' ? 'csv' : 'json';
      const filename = `fsrs-export-${exportId}.${ext}`;
      const filePath = format === 'apkg' 
        ? path.join(exportPath, 'export.apkg')
        : format === 'csv' ? path.join(exportPath, 'export.csv')
        : path.join(exportPath, 'export.json');
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, error: 'File not found' });
      }
      
      res.download(filePath, filename);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ==================== Enhanced Stats API ====================

  // Daily learning stats (last 30 days)
  app.get('/api/stats/daily', (req, res) => {
    try {
      const days = parseInt(req.query.days) || 30;
      const stats = db.prepare(`
        SELECT date(reviewed_at) as date, COUNT(*) as count
        FROM review_logs
        WHERE reviewed_at >= datetime('now', '-' || ? || ' days')
        GROUP BY date(reviewed_at)
        ORDER BY date ASC
      `).all(days);
      
      // Fill in missing days
      const result = [];
      const now = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const found = stats.find(s => s.date === dateStr);
        result.push({
          date: dateStr,
          count: found ? found.count : 0
        });
      }
      
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Deck distribution stats
  app.get('/api/stats/decks', (req, res) => {
    try {
      const stats = db.prepare(`
        SELECT d.name, d.id, COUNT(c.id) as count
        FROM decks d
        LEFT JOIN cards c ON c.deck_id = d.id
        GROUP BY d.id
        ORDER BY count DESC
      `).all();
      
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Retention rate stats
  app.get('/api/stats/retention', (req, res) => {
    try {
      // Calculate retention by interval buckets
      const stats = db.prepare(`
        SELECT 
          CASE 
            WHEN interval < 1 THEN '< 1d'
            WHEN interval < 7 THEN '1-7d'
            WHEN interval < 30 THEN '7-30d'
            WHEN interval < 90 THEN '30-90d'
            ELSE '90d+'
          END as bucket,
          AVG(CASE WHEN rating >= 3 THEN 1.0 ELSE 0.0 END) * 100 as retention,
          COUNT(*) as count
        FROM review_logs
        GROUP BY bucket
        ORDER BY 
          CASE bucket
            WHEN '< 1d' THEN 1
            WHEN '1-7d' THEN 2
            WHEN '7-30d' THEN 3
            WHEN '30-90d' THEN 4
            ELSE 5
          END
      `).all();
      
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
};
