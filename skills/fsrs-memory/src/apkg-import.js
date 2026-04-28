// apkg-import.js - APKG file parser and importer
const AdmZip = require('adm-zip');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const os = require('os');

class APKGImporter {
  constructor(targetDb) {
    this.targetDb = targetDb;
  }

  /**
   * Import APKG file into the target database
   * @param {string} apkgPath - Path to the .apkg file
   * @param {number} targetDeckId - Target deck ID to import cards into
   * @returns {Object} Import result with statistics
   */
  async import(apkgPath, targetDeckId = 1) {
    const startTime = Date.now();
    let tempDb = null;
    let tempDir = null;

    try {
      // Extract APKG (it's a ZIP file)
      const zip = new AdmZip(apkgPath);
      const entries = zip.getEntries();
      
      // Find collection database
      const collectionEntry = entries.find(e => 
        e.entryName.endsWith('.anki2') || e.entryName.endsWith('.anki21')
      );

      if (!collectionEntry) {
        throw new Error('No collection database found in APKG file');
      }

      // Extract to temp location
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apkg-'));
      tempDb = path.join(tempDir, 'collection.anki2');
      zip.extractEntryTo(collectionEntry, tempDir, false, true);

      // Open source database
      const sourceDb = new Database(tempDb, { readonly: true });

      // Get collection info
      const col = sourceDb.prepare('SELECT * FROM col').get();
      const models = JSON.parse(col.models || '{}');
      const decks = JSON.parse(col.decks || '{}');

      // Get deck name for import
      const sourceDeck = targetDeckId === 1 
        ? { name: 'Imported Cards' } 
        : Object.values(decks).find(d => d.id === targetDeckId) || { name: 'Imported Cards' };

      // Create or get target deck
      let deck = this.targetDb.prepare('SELECT * FROM decks WHERE id = ?').get(targetDeckId);
      if (!deck) {
        const result = this.targetDb.prepare('INSERT INTO decks (name, description) VALUES (?, ?)').run(
          sourceDeck.name,
          `Imported from APKG on ${new Date().toLocaleDateString()}`
        );
        targetDeckId = result.lastInsertRowid;
      }

      // Get all notes
      const notes = sourceDb.prepare('SELECT * FROM notes').all();
      
      // Get all cards
      const cards = sourceDb.prepare('SELECT * FROM cards').all();

      // Get model field names
      const modelFields = Object.values(models).map(m => ({
        modelId: m.id,
        fields: m.flds.map(f => f.name)
      }));

      let importedCount = 0;
      let skippedCount = 0;

      // Prepare statements
      const insertCard = this.targetDb.prepare(`
        INSERT INTO cards (deck_id, question, answer, created_at, due_date, interval, ease_factor, repetitions, lapses, state)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // Import cards
      const now = new Date();
      
      for (const ankicard of cards) {
        try {
          // Find corresponding note
          const note = notes.find(n => n.id === ankicard.nid);
          if (!note) {
            skippedCount++;
            continue;
          }

          // Parse fields (tab-separated)
          const fieldValues = note.flds.split('\x1f'); // Anki uses \x1f (unit separator)
          
          // Find model for this note
          const model = modelFields.find(m => m.modelId === note.mid);
          
          // Extract question and answer
          let question = fieldValues[0] || 'No question';
          let answer = fieldValues[1] || fieldValues.slice(1).join('<br>') || 'No answer';

          // If we have field names, create better formatted output
          if (model && model.fields.length >= 2) {
            question = `<strong>${model.fields[0]}:</strong><br>${fieldValues[0] || ''}`;
            answer = `<strong>${model.fields[1]}:</strong><br>${fieldValues[1] || ''}`;
          }

          // Calculate due date from Anki's due value
          // Anki's due is either days (for reviews) or position (for new cards)
          let dueDate = now;
          if (ankicard.type === 2 && ankicard.ivl > 0) {
            // Review card
            dueDate = new Date(now.getTime() + ankicard.due * 24 * 60 * 60 * 1000);
          }

          // Map Anki state to FSRS state
          let state = 'new';
          if (ankicard.type === 2) {
            state = 'review';
          } else if (ankicard.type === 1) {
            state = 'learning';
          }

          // Insert card
          insertCard.run(
            targetDeckId,
            question,
            answer,
            now.toISOString(),
            dueDate.toISOString(),
            ankicard.ivl || 0,
            (ankicard.factor || 2500) / 1000,
            ankicard.reps || 0,
            ankicard.lapses || 0,
            state
          );

          importedCount++;
        } catch (error) {
          console.error('Error importing card:', ankicard.id, error.message);
          skippedCount++;
        }
      }

      sourceDb.close();

      const duration = Date.now() - startTime;

      return {
        success: true,
        importedCount,
        skippedCount,
        deckId: targetDeckId,
        deckName: sourceDeck.name,
        duration,
        message: `Successfully imported ${importedCount} cards${skippedCount > 0 ? ` (${skippedCount} skipped)` : ''}`
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        importedCount: 0,
        skippedCount: 0
      };
    } finally {
      // Cleanup temp files
      if (tempDb && fs.existsSync(tempDb)) {
        fs.unlinkSync(tempDb);
      }
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmdirSync(tempDir);
      }
    }
  }

  /**
   * Preview APKG file contents without importing
   * @param {string} apkgPath - Path to the .apkg file
   * @returns {Object} APKG metadata
   */
  async preview(apkgPath) {
    let tempDb = null;
    let tempDir = null;

    try {
      const zip = new AdmZip(apkgPath);
      const collectionEntry = zip.getEntries().find(e => 
        e.entryName.endsWith('.anki2') || e.entryName.endsWith('.anki21')
      );

      if (!collectionEntry) {
        throw new Error('No collection database found in APKG file');
      }

      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apkg-'));
      tempDb = path.join(tempDir, 'collection.anki2');
      zip.extractEntryTo(collectionEntry, tempDir, false, true);

      const sourceDb = new Database(tempDb, { readonly: true });

      const col = sourceDb.prepare('SELECT * FROM col').get();
      const models = JSON.parse(col.models || '{}');
      const decks = JSON.parse(col.decks || '{}');

      const notesCount = sourceDb.prepare('SELECT COUNT(*) as count FROM notes').get().count;
      const cardsCount = sourceDb.prepare('SELECT COUNT(*) as count FROM cards').get().count;

      sourceDb.close();

      return {
        success: true,
        deckCount: Object.keys(decks).length,
        decks: Object.values(decks).map(d => ({ id: d.id, name: d.name })),
        modelCount: Object.keys(models).length,
        models: Object.values(models).map(m => ({
          id: m.id,
          name: m.name,
          fieldCount: m.flds.length,
          fields: m.flds.map(f => f.name)
        })),
        notesCount,
        cardsCount
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    } finally {
      if (tempDb && fs.existsSync(tempDb)) {
        fs.unlinkSync(tempDb);
      }
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmdirSync(tempDir);
      }
    }
  }
}

module.exports = APKGImporter;
