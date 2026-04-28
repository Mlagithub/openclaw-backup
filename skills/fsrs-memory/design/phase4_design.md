# Phase 4 Design Document - Daily Limits & Template Enhancements

**Date**: 2026-02-27  
**Version**: 4.0.0  
**Status**: Design Complete

---

## Overview

This document details the design for:
1. **Daily Card Limits** - ANKI-style new/review card limits
2. **Template System Enhancements** - Enhanced editor, more templates, better management

---

## Part 1: Database Schema Changes

### 1.1 New Tables

```sql
-- Daily progress tracking
CREATE TABLE IF NOT EXISTS daily_progress (
  date TEXT PRIMARY KEY,           -- YYYY-MM-DD format
  new_count INTEGER DEFAULT 0,     -- New cards studied today
  review_count INTEGER DEFAULT 0,  -- Review cards studied today
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Deck-specific limits
CREATE TABLE IF NOT EXISTS deck_limits (
  deck_id INTEGER PRIMARY KEY,
  new_limit INTEGER,               -- NULL = use global setting
  review_limit INTEGER,            -- NULL = use global setting
  new_limit_today INTEGER,         -- Temporary override (today only)
  review_limit_today INTEGER,      -- Temporary override (today only)
  new_cards_ignore_review_limit BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
);

-- Template field definitions (extends card_templates)
CREATE TABLE IF NOT EXISTS template_fields (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL,
  field_name TEXT NOT NULL,
  field_order INTEGER DEFAULT 0,
  field_type TEXT DEFAULT 'text',  -- text, audio, image, cloze
  is_required BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES card_templates(id) ON DELETE CASCADE,
  UNIQUE(template_id, field_name)
);
```

### 1.2 Schema Modifications

```sql
-- Extend settings table
ALTER TABLE settings ADD COLUMN daily_new_limit INTEGER DEFAULT 20;
ALTER TABLE settings ADD COLUMN daily_review_limit INTEGER DEFAULT 9999;
ALTER TABLE settings ADD COLUMN new_cards_ignore_review_limit BOOLEAN DEFAULT FALSE;

-- Extend decks table
ALTER TABLE decks ADD COLUMN default_template_id INTEGER REFERENCES card_templates(id);

-- Extend cards table
ALTER TABLE cards ADD COLUMN template_id INTEGER REFERENCES card_templates(id);
ALTER TABLE cards ADD COLUMN queue_position INTEGER DEFAULT 0;
ALTER TABLE cards ADD COLUMN buried_until DATE;
ALTER TABLE cards ADD COLUMN tags TEXT;  -- Already in Phase 3, ensure it exists

-- Extend card_templates table
ALTER TABLE card_templates ADD COLUMN fields_json TEXT;  -- JSON array of field names
ALTER TABLE card_templates ADD COLUMN is_cloze BOOLEAN DEFAULT FALSE;
ALTER TABLE card_templates ADD COLUMN generate_reverse BOOLEAN DEFAULT FALSE;
```

### 1.3 Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_daily_progress_date ON daily_progress(date);
CREATE INDEX IF NOT EXISTS idx_deck_limits_deck_id ON deck_limits(deck_id);
CREATE INDEX IF NOT EXISTS idx_cards_queue_position ON cards(queue_position);
CREATE INDEX IF NOT EXISTS idx_cards_buried_until ON cards(buried_until);
CREATE INDEX IF NOT EXISTS idx_template_fields_template_id ON template_fields(template_id);
```

---

## Part 2: API Design

### 2.1 Daily Limits API

#### GET /api/settings/limits
Get global daily limit settings.

**Response**:
```json
{
  "success": true,
  "data": {
    "daily_new_limit": 20,
    "daily_review_limit": 9999,
    "new_cards_ignore_review_limit": false
  }
}
```

#### PUT /api/settings/limits
Update global daily limit settings.

**Request**:
```json
{
  "daily_new_limit": 25,
  "daily_review_limit": 500,
  "new_cards_ignore_review_limit": false
}
```

#### GET /api/decks/:id/limits
Get deck-specific limits.

**Response**:
```json
{
  "success": true,
  "data": {
    "deck_id": 1,
    "new_limit": null,           // null = use global
    "review_limit": null,
    "new_limit_today": null,
    "review_limit_today": null,
    "new_cards_ignore_review_limit": false,
    "effective_new_limit": 20,   // Computed (deck or global)
    "effective_review_limit": 9999
  }
}
```

#### PUT /api/decks/:id/limits
Set deck-specific limits.

**Request**:
```json
{
  "new_limit": 15,
  "review_limit": 300,
  "new_limit_today": 10,         // Optional, temporary
  "review_limit_today": 150,     // Optional, temporary
  "new_cards_ignore_review_limit": false
}
```

#### GET /api/daily/progress
Get today's learning progress.

**Response**:
```json
{
  "success": true,
  "data": {
    "date": "2026-02-27",
    "new_count": 12,
    "review_count": 85,
    "new_limit": 20,
    "review_limit": 9999,
    "new_remaining": 8,
    "review_remaining": 9914
  }
}
```

#### POST /api/daily/reset
Reset daily progress (admin only).

**Request**:
```json
{
  "date": "2026-02-27",
  "reset_new": true,
  "reset_review": false
}
```

#### GET /api/queue/today
Get cards to study today (respecting limits).

**Query Params**:
- `deck_id` (optional): Filter by deck
- `type`: "all" | "new" | "review"

**Response**:
```json
{
  "success": true,
  "data": {
    "new_cards": [
      { "id": 1, "question": "...", "answer": "...", "deck_id": 1 }
    ],
    "review_cards": [
      { "id": 2, "question": "...", "answer": "...", "due_date": "..." }
    ],
    "limits": {
      "new_total": 20,
      "new_done": 12,
      "new_remaining": 8,
      "review_total": 9999,
      "review_done": 85,
      "review_remaining": 9914
    },
    "queue_complete": false
  }
}
```

### 2.2 Template API Extensions

#### POST /api/templates/:id/preview
Preview template rendering.

**Request**:
```json
{
  "fields": {
    "question": "What is the capital of France?",
    "answer": "Paris",
    "tags": "geography europe"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "front": "<div class='front'>What is the capital of France?</div>",
    "back": "<div class='front'>What is the capital of France?</div><hr id='answer'><div class='back'>Paris</div>",
    "css": ".card { font-family: Arial; }",
    "template_name": "Basic Card"
  }
}
```

#### POST /api/templates/import
Import template from JSON.

**Request**:
```json
{
  "name": "Custom Audio Card",
  "type": "audio",
  "front_template": "{{audio}}",
  "back_template": "{{FrontSide}}<hr>{{text}}",
  "css": ".card { ... }",
  "fields": ["audio", "text"],
  "is_cloze": false,
  "generate_reverse": false
}
```

#### GET /api/templates/export/:id
Export template as JSON.

**Response**: Downloadable JSON file

#### POST /api/templates/:id/clone
Clone an existing template.

**Request**:
```json
{
  "new_name": "Basic Card (Copy)"
}
```

#### PUT /api/decks/:id/template
Set default template for a deck.

**Request**:
```json
{
  "template_id": 3
}
```

#### POST /api/cards/apply-template
Batch apply template to cards.

**Request**:
```json
{
  "template_id": 3,
  "deck_id": 1,
  "card_ids": [1, 2, 3]  // Optional, if omitted applies to all in deck
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "updated_count": 15,
    "deck_id": 1,
    "template_id": 3
  }
}
```

---

## Part 3: Module Design

### 3.1 Daily Limits Module (`src/daily-limits.js`)

```javascript
const db = require('./storage');

class DailyLimits {
  /**
   * Get global limit settings
   */
  getGlobalLimits() {
    const settings = db.prepare(`
      SELECT daily_new_limit, daily_review_limit, new_cards_ignore_review_limit
      FROM settings WHERE key = 'global'
    `).get();
    
    return {
      daily_new_limit: settings?.daily_new_limit || 20,
      daily_review_limit: settings?.daily_review_limit || 9999,
      new_cards_ignore_review_limit: settings?.new_cards_ignore_review_limit || false
    };
  }

  /**
   * Get effective limits for a deck (deck-specific or global)
   */
  getDeckLimits(deckId) {
    const global = this.getGlobalLimits();
    const deckLimits = db.prepare('SELECT * FROM deck_limits WHERE deck_id = ?').get(deckId);
    
    if (!deckLimits) {
      return {
        deck_id: deckId,
        new_limit: null,
        review_limit: null,
        new_limit_today: null,
        review_limit_today: null,
        new_cards_ignore_review_limit: global.new_cards_ignore_review_limit,
        effective_new_limit: global.daily_new_limit,
        effective_review_limit: global.daily_review_limit
      };
    }
    
    // Today's temporary limits take precedence
    const today = new Date().toISOString().split('T')[0];
    const newLimit = deckLimits.new_limit_today || deckLimits.new_limit || global.daily_new_limit;
    const reviewLimit = deckLimits.review_limit_today || deckLimits.review_limit || global.daily_review_limit;
    
    // Clear today-only limits after midnight
    if (deckLimits.new_limit_today !== null || deckLimits.review_limit_today !== null) {
      // Check if limits are expired (simplified - should check date)
      // In production, would verify the date matches today
    }
    
    return {
      deck_id: deckId,
      new_limit: deckLimits.new_limit,
      review_limit: deckLimits.review_limit,
      new_limit_today: deckLimits.new_limit_today,
      review_limit_today: deckLimits.review_limit_today,
      new_cards_ignore_review_limit: deckLimits.new_cards_ignore_review_limit || global.new_cards_ignore_review_limit,
      effective_new_limit: newLimit,
      effective_review_limit: reviewLimit
    };
  }

  /**
   * Get today's progress
   */
  getTodayProgress() {
    const today = new Date().toISOString().split('T')[0];
    let progress = db.prepare('SELECT * FROM daily_progress WHERE date = ?').get(today);
    
    if (!progress) {
      // Initialize today's progress
      db.prepare(`
        INSERT INTO daily_progress (date, new_count, review_count)
        VALUES (?, 0, 0)
      `).run(today);
      progress = { date: today, new_count: 0, review_count: 0 };
    }
    
    return progress;
  }

  /**
   * Increment progress counters
   */
  incrementProgress(cardType) {
    const today = new Date().toISOString().split('T')[0];
    const column = cardType === 'new' ? 'new_count' : 'review_count';
    
    db.prepare(`
      UPDATE daily_progress 
      SET ${column} = ${column} + 1, last_updated = CURRENT_TIMESTAMP
      WHERE date = ?
    `).run(today);
  }

  /**
   * Get cards to study today (respecting limits)
   */
  getTodaysCards(deckId = null) {
    const progress = this.getTodayProgress();
    const limits = deckId ? this.getDeckLimits(deckId) : this.getGlobalLimits();
    
    // Get review cards
    let reviewQuery = 'SELECT * FROM cards WHERE due_date <= datetime("now")';
    const params = [];
    if (deckId) {
      reviewQuery += ' AND deck_id = ?';
      params.push(deckId);
    }
    reviewQuery += ' ORDER BY due_date ASC, queue_position ASC';
    
    const allReviews = db.prepare(reviewQuery).all(...params);
    const reviewRemaining = limits.effective_review_limit - progress.review_count;
    const reviews = allReviews.slice(0, Math.max(0, reviewRemaining));
    
    // Get new cards (only if review limit not exceeded or ignore setting enabled)
    let newCards = [];
    const ignoreReviewLimit = limits.new_cards_ignore_review_limit;
    
    if (ignoreReviewLimit || progress.review_count < limits.effective_review_limit) {
      let newQuery = "SELECT * FROM cards WHERE (state = 'new' OR repetitions = 0)";
      const newParams = [];
      
      if (deckId) {
        newQuery += ' AND deck_id = ?';
        newParams.push(deckId);
      }
      
      newQuery += ' ORDER BY queue_position ASC, created_at ASC';
      
      const allNew = db.prepare(newQuery).all(...newParams);
      const newRemaining = limits.effective_new_limit - progress.new_count;
      newCards = allNew.slice(0, Math.max(0, newRemaining));
    }
    
    return {
      new_cards: newCards,
      review_cards: reviews,
      limits: {
        new_total: limits.effective_new_limit,
        new_done: progress.new_count,
        new_remaining: Math.max(0, limits.effective_new_limit - progress.new_count),
        review_total: limits.effective_review_limit,
        review_done: progress.review_count,
        review_remaining: Math.max(0, limits.effective_review_limit - progress.review_count)
      },
      queue_complete: reviews.length < allReviews.length || newCards.length < allNew?.length
    };
  }

  /**
   * Reset daily progress
   */
  resetProgress(date, options = {}) {
    const { reset_new = true, reset_review = true } = options;
    
    const updates = [];
    if (reset_new) updates.push('new_count = 0');
    if (reset_review) updates.push('review_count = 0');
    
    if (updates.length === 0) return;
    
    db.prepare(`
      UPDATE daily_progress 
      SET ${updates.join(', ')}, last_updated = CURRENT_TIMESTAMP
      WHERE date = ?
    `).run(date);
  }
}

module.exports = new DailyLimits();
```

### 3.2 Template Manager Module (`src/template-manager.js`)

```javascript
const db = require('./storage');

class TemplateManager {
  /**
   * Get all templates
   */
  getAllTemplates() {
    return db.prepare('SELECT * FROM card_templates ORDER BY id').all();
  }

  /**
   * Get template by ID
   */
  getTemplate(id) {
    return db.prepare('SELECT * FROM card_templates WHERE id = ?').get(id);
  }

  /**
   * Create new template
   */
  createTemplate(data) {
    const { name, type, front_template, back_template, css, fields, is_cloze, generate_reverse } = data;
    
    const stmt = db.prepare(`
      INSERT INTO card_templates (name, type, front_template, back_template, css, fields_json, is_cloze, generate_reverse)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      name,
      type || 'basic',
      front_template,
      back_template,
      css || '',
      JSON.stringify(fields || ['question', 'answer']),
      is_cloze || false,
      generate_reverse || false
    );
    
    // Insert field definitions
    if (fields) {
      const fieldStmt = db.prepare(`
        INSERT INTO template_fields (template_id, field_name, field_order, field_type)
        VALUES (?, ?, ?, ?)
      `);
      
      fields.forEach((field, index) => {
        fieldStmt.run(result.lastInsertRowid, field.name, index, field.type || 'text');
      });
    }
    
    return this.getTemplate(result.lastInsertRowid);
  }

  /**
   * Update template
   */
  updateTemplate(id, data) {
    const { name, type, front_template, back_template, css, fields, is_cloze, generate_reverse } = data;
    
    db.prepare(`
      UPDATE card_templates 
      SET name = ?, type = ?, front_template = ?, back_template = ?, 
          css = ?, fields_json = ?, is_cloze = ?, generate_reverse = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, type, front_template, back_template, css, 
          JSON.stringify(fields), is_cloze, generate_reverse, id);
    
    // Update field definitions
    if (fields) {
      db.prepare('DELETE FROM template_fields WHERE template_id = ?').run(id);
      
      const fieldStmt = db.prepare(`
        INSERT INTO template_fields (template_id, field_name, field_order, field_type)
        VALUES (?, ?, ?, ?)
      `);
      
      fields.forEach((field, index) => {
        fieldStmt.run(id, field.name, index, field.type || 'text');
      });
    }
    
    return this.getTemplate(id);
  }

  /**
   * Delete template
   */
  deleteTemplate(id) {
    const template = this.getTemplate(id);
    if (!template) throw new Error('Template not found');
    if (template.is_default) throw new Error('Cannot delete default template');
    
    db.prepare('DELETE FROM template_fields WHERE template_id = ?').run(id);
    db.prepare('DELETE FROM card_templates WHERE id = ?').run(id);
  }

  /**
   * Clone template
   */
  cloneTemplate(id, newName) {
    const template = this.getTemplate(id);
    if (!template) throw new Error('Template not found');
    
    const fields = JSON.parse(template.fields_json || '["question", "answer"]');
    
    return this.createTemplate({
      name: newName,
      type: template.type,
      front_template: template.front_template,
      back_template: template.back_template,
      css: template.css,
      fields: fields.map(f => ({ name: f, type: 'text' })),
      is_cloze: template.is_cloze,
      generate_reverse: template.generate_reverse
    });
  }

  /**
   * Preview template rendering
   */
  previewTemplate(id, fields) {
    const template = this.getTemplate(id);
    if (!template) throw new Error('Template not found');
    
    let front = template.front_template;
    let back = template.back_template;
    
    // Replace field variables
    for (const [key, value] of Object.entries(fields || {})) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      const textRegex = new RegExp(`\\{\\{text:${key}\\}\\}`, 'g');
      
      // {{text:Field}} - strip HTML
      const textValue = String(value || '').replace(/<[^>]*>/g, '');
      back = back.replace(textRegex, textValue);
      
      // {{Field}} - normal replacement
      front = front.replace(regex, value || '');
      back = back.replace(regex, value || '');
    }
    
    // Handle {{FrontSide}}
    back = back.replace(/{{FrontSide}}/g, front);
    
    // Handle {{Tags}}
    const tagsRegex = /{{Tags}}/g;
    front = front.replace(tagsRegex, fields?.tags || '');
    back = back.replace(tagsRegex, fields?.tags || '');
    
    return {
      front,
      back,
      css: template.css,
      template_name: template.name
    };
  }

  /**
   * Export template as JSON
   */
  exportTemplate(id) {
    const template = this.getTemplate(id);
    if (!template) throw new Error('Template not found');
    
    const fields = db.prepare(
      'SELECT field_name, field_order, field_type, is_required FROM template_fields WHERE template_id = ? ORDER BY field_order'
    ).all(id);
    
    return {
      name: template.name,
      type: template.type,
      front_template: template.front_template,
      back_template: template.back_template,
      css: template.css,
      fields: fields.map(f => ({
        name: f.field_name,
        type: f.field_type,
        required: f.is_required
      })),
      is_cloze: template.is_cloze,
      generate_reverse: template.generate_reverse,
      version: '1.0',
      exported_at: new Date().toISOString()
    };
  }

  /**
   * Import template from JSON
   */
  importTemplate(json) {
    const { name, type, front_template, back_template, css, fields, is_cloze, generate_reverse } = json;
    
    // Validate required fields
    if (!name || !front_template || !back_template) {
      throw new Error('Missing required template fields');
    }
    
    return this.createTemplate({
      name,
      type,
      front_template,
      back_template,
      css,
      fields,
      is_cloze,
      generate_reverse
    });
  }

  /**
   * Set default template for deck
   */
  setDeckTemplate(deckId, templateId) {
    const template = this.getTemplate(templateId);
    if (!template) throw new Error('Template not found');
    
    db.prepare('UPDATE decks SET default_template_id = ? WHERE id = ?').run(templateId, deckId);
  }

  /**
   * Apply template to cards
   */
  applyToCards(templateId, deckId, cardIds = null) {
    const template = this.getTemplate(templateId);
    if (!template) throw new Error('Template not found');
    
    let query;
    let params;
    
    if (cardIds && cardIds.length > 0) {
      query = 'UPDATE cards SET template_id = ? WHERE id IN (' + cardIds.map(() => '?').join(',') + ')';
      params = [templateId, ...cardIds];
    } else {
      query = 'UPDATE cards SET template_id = ? WHERE deck_id = ?';
      params = [templateId, deckId];
    }
    
    const result = db.prepare(query).run(...params);
    return { updated_count: result.changes, deck_id: deckId, template_id: templateId };
  }
}

module.exports = new TemplateManager();
```

---

## Part 4: UI Design

### 4.1 Settings Page Layout

```
┌────────────────────────────────────────────────────────────┐
│  Settings                                                  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Daily Limits                                        │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │                                                     │  │
│  │  New Cards per Day                                  │  │
│  │  ┌────────────────────────────────┐                │  │
│  │  │ 20                               │                │  │
│  │  └────────────────────────────────┘                │  │
│  │  Cards introduced each day you study               │  │
│  │                                                     │  │
│  │  Maximum Reviews per Day                            │  │
│  │  ┌────────────────────────────────┐                │  │
│  │  │ 9999                             │                │  │
│  │  └────────────────────────────────┘                │  │
│  │  Set to a high number for unlimited                │  │
│  │                                                     │  │
│  │  ☐ New cards ignore review limit                   │  │
│  │  Show new cards even when review limit reached     │  │
│  │                                                     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  [Save Changes] [Reset to Defaults]                       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 4.2 Deck Options Modal

```
┌─────────────────────────────────────────────────────────┐
│  Deck Options: 默认牌组                             ✕   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Daily Limits                                      │ │
│  ├───────────────────────────────────────────────────┤ │
│  │                                                   │ │
│  │  Limit Type:  ○ Preset  ● This deck  ○ Today only│ │
│  │                                                   │ │
│  │  New Cards:  ┌────────┐                          │ │
│  │              │   15   │                          │ │
│  │              └────────┘                          │ │
│  │                                                   │ │
│  │  Reviews:    ┌────────┐                          │ │
│  │              │  300   │                          │ │
│  │              └────────┘                          │ │
│  │                                                   │ │
│  │  ☐ New cards ignore review limit                │ │
│  │                                                   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Card Template                                     │ │
│  ├───────────────────────────────────────────────────┤ │
│  │                                                   │ │
│  │  Default Template:                                │ │
│  │  ┌─────────────────────────────────────────────┐ │ │
│  │  │ Basic Card                              ▼   │ │ │
│  │  └─────────────────────────────────────────────┘ │ │
│  │                                                   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  [Cancel] [Save]                                       │
└─────────────────────────────────────────────────────────┘
```

### 4.3 Daily Progress Widget

```
┌─────────────────────────────────────────────────────────┐
│  Today's Progress                          2026-02-27  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  New Cards                   Reviews                   │
│  ┌─────────────────────┐    ┌─────────────────────┐   │
│  │  ████████░░░░░░░░  │    │  █░░░░░░░░░░░░░░░  │   │
│  │  12 / 20            │    │  85 / 9999          │   │
│  │  8 remaining        │    │  9914 remaining     │   │
│  └─────────────────────┘    └─────────────────────┘   │
│                                                         │
│  ✓ On track!              ⚠ Review backlog building   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 4.4 Template Editor

```
┌─────────────────────────────────────────────────────────────────┐
│  Template Editor: Basic Card                               ✕   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Template Type: [Basic Card                      ▼]            │
│                                                                 │
│  ┌──────────────────────┐ ┌─────────────────────────────────┐ │
│  │ Front Template       │ │ Preview                         │ │
│  ├──────────────────────┤ ├─────────────────────────────────┤ │
│  │                      │ │                                 │ │
│  │ {{question}}         │ │ What is the capital of France? │ │
│  │                      │ │                                 │ │
│  │                      │ │                                 │ │
│  │                      │ │ [Show Answer]                  │ │
│  │                      │ │                                 │ │
│  └──────────────────────┘ └─────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────┐ ┌─────────────────────────────────┐ │
│  │ Back Template        │ │ Preview                         │ │
│  ├──────────────────────┤ ├─────────────────────────────────┤ │
│  │                      │ │ What is the capital of France? │ │
│  │ {{FrontSide}}        │ │ ─────────────────────────────── │ │
│  │ <hr id=answer>       │ │ Paris                           │ │
│  │ {{answer}}           │ │                                 │ │
│  │                      │ │                                 │ │
│  └──────────────────────┘ └─────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ CSS Styling                                               │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │ .card { font-family: Arial; font-size: 20px; }           │ │
│  │ .front { font-weight: bold; }                            │ │
│  │ .back { color: #333; }                                   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Available Fields: [question] [answer] [tags] [deck]          │
│                                                                 │
│  [Cancel] [Reset] [Clone] [Save]                              │
└─────────────────────────────────────────────────────────────────┘
```

### 4.5 Template List

```
┌─────────────────────────────────────────────────────────┐
│  Card Templates                            [+ New]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 📄 Basic Card                              [⋮]   │ │
│  │    Front → Back                                  │ │
│  │    Fields: question, answer                      │ │
│  │    Default ✓                                     │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 🔄 Basic (reversed)                        [⋮]   │ │
│  │    Front → Back + Back → Front                   │ │
│  │    Fields: question, answer                      │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ ⌨️  Type in Answer                         [⋮]   │ │
│  │    Type answer, compare automatically            │ │
│  │    Fields: question, answer                      │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 📝 Cloze Deletion                          [⋮]   │ │
│  │    Fill in the blank                             │ │
│  │    Fields: text, extra                           │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 🎧 Audio Card                              [⋮]   │ │
│  │    Audio → Text                                  │ │
│  │    Fields: audio, text                           │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Part 5: Predefined Templates

### 5.1 Basic Card
```json
{
  "name": "Basic Card",
  "type": "basic",
  "front_template": "{{question}}",
  "back_template": "{{FrontSide}}<hr id=answer>{{answer}}",
  "css": ".card { font-family: Arial; font-size: 20px; }\n.front { font-weight: bold; }",
  "fields": ["question", "answer"],
  "is_cloze": false,
  "generate_reverse": false
}
```

### 5.2 Basic (Reversed)
```json
{
  "name": "Basic (Reversed)",
  "type": "basic-reverse",
  "front_template": "{{question}}",
  "back_template": "{{FrontSide}}<hr id=answer>{{answer}}",
  "css": ".card { font-family: Arial; font-size: 20px; }",
  "fields": ["question", "answer"],
  "is_cloze": false,
  "generate_reverse": true
}
```

### 5.3 Type in Answer
```json
{
  "name": "Type in Answer",
  "type": "type-answer",
  "front_template": "{{question}}<br>{{type:answer}}",
  "back_template": "{{FrontSide}}<hr id=answer>{{type:answer}}",
  "css": ".card { font-family: Arial; font-size: 20px; }\n#typeans { font-size: 18px; padding: 8px; border: 1px solid #ccc; }",
  "fields": ["question", "answer"],
  "is_cloze": false,
  "generate_reverse": false
}
```

### 5.4 Cloze Deletion
```json
{
  "name": "Cloze Deletion",
  "type": "cloze",
  "front_template": "{{cloze:text}}",
  "back_template": "{{cloze:text}}<br>{{extra}}",
  "css": ".card { font-family: Arial; font-size: 20px; }\n.cloze { color: #007bff; font-weight: bold; }",
  "fields": ["text", "extra"],
  "is_cloze": true,
  "generate_reverse": false
}
```

### 5.5 Audio Card
```json
{
  "name": "Audio Card",
  "type": "audio",
  "front_template": "{{audio}}",
  "back_template": "{{FrontSide}}<hr id=answer>{{text}}",
  "css": ".card { font-family: Arial; font-size: 20px; }\naudio { width: 100%; margin: 10px 0; }",
  "fields": [
    {"name": "audio", "type": "audio"},
    {"name": "text", "type": "text"}
  ],
  "is_cloze": false,
  "generate_reverse": false
}
```

### 5.6 Image Card
```json
{
  "name": "Image Card",
  "type": "image",
  "front_template": "<img src='{{image}}' style='max-width: 100%;'>",
  "back_template": "{{FrontSide}}<hr id=answer>{{text}}",
  "css": ".card { font-family: Arial; font-size: 20px; }",
  "fields": [
    {"name": "image", "type": "image"},
    {"name": "text", "type": "text"}
  ],
  "is_cloze": false,
  "generate_reverse": false
}
```

---

## Part 6: Migration Script

```sql
-- Phase 4 Migration
-- Run after Phase 3 tables exist

-- 1. Create daily_progress table
CREATE TABLE IF NOT EXISTS daily_progress (
  date TEXT PRIMARY KEY,
  new_count INTEGER DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create deck_limits table
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
);

-- 3. Create template_fields table
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
);

-- 4. Extend settings table
ALTER TABLE settings ADD COLUMN daily_new_limit INTEGER DEFAULT 20;
ALTER TABLE settings ADD COLUMN daily_review_limit INTEGER DEFAULT 9999;
ALTER TABLE settings ADD COLUMN new_cards_ignore_review_limit BOOLEAN DEFAULT FALSE;

-- 5. Extend decks table
ALTER TABLE decks ADD COLUMN default_template_id INTEGER REFERENCES card_templates(id);

-- 6. Extend cards table
ALTER TABLE cards ADD COLUMN template_id INTEGER REFERENCES card_templates(id);
ALTER TABLE cards ADD COLUMN queue_position INTEGER DEFAULT 0;
ALTER TABLE cards ADD COLUMN buried_until DATE;

-- 7. Extend card_templates table
ALTER TABLE card_templates ADD COLUMN fields_json TEXT;
ALTER TABLE card_templates ADD COLUMN is_cloze BOOLEAN DEFAULT FALSE;
ALTER TABLE card_templates ADD COLUMN generate_reverse BOOLEAN DEFAULT FALSE;

-- 8. Create indexes
CREATE INDEX IF NOT EXISTS idx_daily_progress_date ON daily_progress(date);
CREATE INDEX IF NOT EXISTS idx_deck_limits_deck_id ON deck_limits(deck_id);
CREATE INDEX IF NOT EXISTS idx_cards_queue_position ON cards(queue_position);
CREATE INDEX IF NOT EXISTS idx_cards_buried_until ON cards(buried_until);
CREATE INDEX IF NOT EXISTS idx_template_fields_template_id ON template_fields(template_id);

-- 9. Migrate existing templates to new format
UPDATE card_templates SET fields_json = '["question", "answer"]' WHERE fields_json IS NULL;
UPDATE card_templates SET is_cloze = FALSE WHERE is_cloze IS NULL;
UPDATE card_templates SET generate_reverse = (type = 'basic-reverse') WHERE generate_reverse IS NULL;

-- 10. Insert field definitions for existing templates
INSERT OR IGNORE INTO template_fields (template_id, field_name, field_order, field_type, is_required)
SELECT id, 'question', 0, 'text', TRUE FROM card_templates;

INSERT OR IGNORE INTO template_fields (template_id, field_name, field_order, field_type, is_required)
SELECT id, 'answer', 1, 'text', TRUE FROM card_templates;
```

---

## Part 7: Testing Plan

### 7.1 Daily Limits Tests
- [ ] Set global limit to 5 new cards/day
- [ ] Add 10 new cards to deck
- [ ] Verify only 5 are shown in queue
- [ ] Study 5 cards, verify remaining 5 not shown
- [ ] Reset daily progress, verify all 10 available again
- [ ] Set deck-specific limit, verify overrides global
- [ ] Set "today only" limit, verify temporary
- [ ] Test review limit blocking new cards
- [ ] Test "new cards ignore review limit" setting

### 7.2 Template Tests
- [ ] Create new template with custom HTML
- [ ] Preview template with sample data
- [ ] Clone existing template
- [ ] Export template to JSON
- [ ] Import template from JSON
- [ ] Delete non-default template
- [ ] Verify default template cannot be deleted
- [ ] Apply template to deck
- [ ] Apply template to specific cards
- [ ] Test all 6 predefined templates

### 7.3 Integration Tests
- [ ] Daily limits work with FSRS scheduling
- [ ] Template rendering works with media files
- [ ] Progress resets at midnight
- [ ] Deck limits work with subdecks (future)

---

## Part 8: Implementation Checklist

### Phase 4.1: Daily Limits
- [ ] Run database migration
- [ ] Implement `src/daily-limits.js` module
- [ ] Add API endpoints for limits
- [ ] Update `src/api-phase3.js` with new endpoints
- [ ] Update UI: Settings page
- [ ] Update UI: Deck options modal
- [ ] Update UI: Daily progress widget
- [ ] Update queue logic in scheduler
- [ ] Write tests
- [ ] Update documentation

### Phase 4.2: Template Enhancements
- [ ] Extend database schema
- [ ] Implement `src/template-manager.js` module
- [ ] Add API endpoints for template management
- [ ] Update UI: Template editor with syntax highlighting
- [ ] Update UI: Template list
- [ ] Add 6 predefined templates
- [ ] Implement import/export
- [ ] Implement clone functionality
- [ ] Write tests
- [ ] Update documentation

---

**Status**: Design Complete  
**Next**: Iteration 2 - Implementation by code-agent
