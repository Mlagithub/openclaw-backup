# ANKI Daily Limits & Template System Research

**Date**: 2026-02-27  
**Purpose**: Inform fsrs-memory daily limit and template system implementation

---

## Part 1: ANKI Daily Limit Mechanism

### 1.1 Daily Limits Overview

ANKI implements **two separate daily limits**:

| Limit Type | Default | Purpose |
|------------|---------|---------|
| **New Cards/Day** | 20 | Controls how many new cards can be introduced each day |
| **Maximum Reviews/Day** | Unlimited (can be set) | Upper limit on review cards shown per day |

### 1.2 Key Design Patterns

#### **New Cards/Day**
- **Reset behavior**: If you study fewer than the limit or miss a day, counts reset to original setting the next day
- **No accumulation**: You won't be given more cards than your limit allows on subsequent days
- **Subdeck behavior**: When studying a deck with subdecks:
  - Subdeck limits control the **maximum number of cards drawn from that particular deck**
  - Selected (parent) deck's limits control the **total number of cards shown**

#### **Maximum Reviews/Day**
- **Hard limit**: When reached, Anki will NOT show any more review cards for the day
- **Overflow message**: A message appears in the congratulations screen suggesting to increase the limit if time permits
- **Learning cards count**: Interday learning cards (crossed day boundary) are included in the review count
- **Peak smoothing**: Helps smooth out occasional peaks in due card counts

#### **Per-Deck Daily Limits** (ANKI 23.10+)
ANKI provides **three options** for daily limits:
1. **Preset**: Applies to all decks using a preset
2. **This deck**: Specific to a particular deck (permanent)
3. **Today only**: Specific to a particular deck (temporary)

This eliminates the need to clone presets just for custom limits.

#### **New Cards Ignore Review Limit**
- **Default behavior**: Review limit also applies to new cards (no new cards shown when review limit reached)
- **Optional**: Can enable to show new cards regardless of review limit
- **Recommendation**: If behind on reviews, stop introducing new cards until caught up

#### **Limits Start From Top**
- **Default**: Higher-level deck limits do NOT apply when studying a subdeck
- **When enabled**: Parent deck limits also apply to subdecks
- **Use case**: Enforce total limit across all subdecks when studying individually

### 1.3 Card Queue Management

#### **Gather Order** (New Cards)
ANKI gathers cards in this order:
1. Intraday learning cards
2. Interday learning cards
3. Review cards
4. New cards

**New Card Gather Options**:
- **Deck**: Gathers from each subdeck in order (top to bottom), cards in ascending position
- **Deck, then random notes**: Subdeck order, random notes within
- **Ascending position**: Oldest-added first (by due #)
- **Descending position**: Latest-added first
- **Random notes**: Fully random
- **Random cards**: Fully random

#### **Display Order Options**
- **New/Review Order**: Mix with reviews | Show before | Show after
- **Interday Learning/Review Order**: Mix | Before | After
- **Review Sort Order**:
  - Due date, then random (default, recommended)
  - Due date, then deck
  - Deck, then due date (not recommended)
  - Ascending/descending intervals
  - Ascending/descending ease
  - Relative overdueness (for backlogs)

### 1.4 Burying (Sibling Management)

When multiple cards from the same note exist:
- **Bury new siblings**: Delay other new cards until next day
- **Bury review siblings**: Delay other review cards until next day
- **Bury interday learning siblings**: Delay learning cards that crossed day boundary

**Burying logic**: Earlier card types in the gather order can bury later types, but not vice versa.

### 1.5 Overflow Handling

**What happens to cards exceeding daily limits?**
- **New cards**: Stay in the new card queue, shown the next day (if within limit)
- **Review cards**: Stay due, shown the next day (review limits don't push due dates)
- **Learning cards**: Continue with their learning schedule (not subject to daily limits once in learning)

**Key insight**: ANKI does NOT automatically reschedule cards due to daily limits. Cards simply remain in their respective queues.

### 1.6 FSRS Integration

With FSRS enabled:
- **Learning steps**: Should all be < 1 day (recommended: 10m, 30m)
- **Desired retention**: Controls workload (default 90%, range 0.85-0.97 recommended)
- **Simulator**: Can predict workload based on new cards/day and max reviews/day settings

---

## Part 2: ANKI Template System

### 2.1 Template Structure

Each card type has **three components**:

```
┌─────────────────────────┐
│  Front Template (HTML)  │
│  {{Front}}              │
│  {{Field1}}<br>         │
└─────────────────────────┘
         ↓
┌─────────────────────────┐
│  Back Template (HTML)   │
│  {{FrontSide}}          │
│  <hr id=answer>         │
│  {{Back}}               │
└─────────────────────────┘
         ↓
┌─────────────────────────┐
│  Styling (CSS)          │
│  .card { font-family... │
│  .front { ... }         │
└─────────────────────────┘
```

### 2.2 Field Replacement Syntax

| Syntax | Description |
|--------|-------------|
| `{{FieldName}}` | Basic field replacement (case-sensitive) |
| `{{FrontSide}}` | Content of front template (back template only) |
| `{{Tags}}` | Note's tags |
| `{{Deck}}` | Card's deck |
| `{{CardFlag}}` | Card's flag |
| `{{hint:FieldName}}` | Hidden until clicked |
| `{{type:FieldName}}` | Type-in-the-answer comparison |
| `{{text:FieldName}}` | Strip HTML formatting |
| `{{tts en_US:Field}}` | Text-to-speech |
| `{{cloze:Text}}` | Cloze deletion |
| `{{furigana:Field}}` | Ruby characters for Japanese |

### 2.3 Special Features

#### **Hint Fields**
```html
{{hint:MyField}}
```
Shows "show hint" link, reveals content on click.

#### **Type-in-the-Answer**
```html
{{type:Foreign Word}}
```
Displays text box, compares input with correct answer on reveal.

#### **Cloze Deletion**
```html
{{cloze:Text}}
```
Generates fill-in-the-blank cards from text like `{{c1::answer}}`.

#### **Deck Override**
Templates can specify a different deck than the one selected during card creation.

### 2.4 Predefined Template Types (Common Patterns)

1. **Basic** (Front → Back)
   - Front: `{{Front}}`
   - Back: `{{FrontSide}}<hr id=answer>{{Back}}`

2. **Basic (and reversed card)**
   - Generates 2 cards: Front→Back and Back→Front

3. **Basic (type in the answer)**
   - Front: `{{Front}}{{type:Back}}`
   - Back: `{{FrontSide}}<hr id=answer>{{type:Back}}`

4. **Cloze**
   - Text: `{{cloze:Text}}`
   - Extra: `{{Extra}}`
   - Back: `{{cloze:Text}}<br>{{BackExtra}}`

5. **Audio** (for language learning)
   - Front: `{{Audio}}`
   - Back: `{{FrontSide}}<hr id=answer>{{Text}}`

---

## Part 3: Recommendations for fsrs-memory

### 3.1 Daily Limit Implementation

#### **Database Schema**
```sql
-- Global settings table (already exists, extend it)
ALTER TABLE settings ADD COLUMN daily_new_limit INTEGER DEFAULT 20;
ALTER TABLE settings ADD COLUMN daily_review_limit INTEGER DEFAULT NULL;

-- Deck-specific limits (new table)
CREATE TABLE deck_limits (
  deck_id INTEGER PRIMARY KEY,
  new_limit INTEGER DEFAULT NULL,  -- NULL = use global
  review_limit INTEGER DEFAULT NULL,
  new_limit_today INTEGER DEFAULT NULL,  -- temporary override
  review_limit_today INTEGER DEFAULT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deck_id) REFERENCES decks(id)
);

-- Daily progress tracking (new table)
CREATE TABLE daily_progress (
  date TEXT PRIMARY KEY,  -- YYYY-MM-DD
  new_count INTEGER DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  reset_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Card queue state (extend cards table)
ALTER TABLE cards ADD COLUMN queue_position INTEGER;  -- for new card ordering
ALTER TABLE cards ADD COLUMN buried_until DATE;  -- for sibling burying
```

#### **API Endpoints**
```
GET    /api/settings/limits          - Get global limits
PUT    /api/settings/limits          - Update global limits
GET    /api/decks/:id/limits         - Get deck-specific limits
PUT    /api/decks/:id/limits         - Set deck-specific limits
GET    /api/daily/progress           - Get today's progress
POST   /api/daily/reset              - Reset daily progress (admin)
GET    /api/queue/new                - Get new card queue (respecting limits)
GET    /api/queue/review             - Get review queue (respecting limits)
```

#### **Queue Logic**
```javascript
// Pseudocode for getting today's cards
function getTodaysCards(deckId) {
  const progress = getDailyProgress();
  const limits = getLimits(deckId);
  
  // Check review limit
  const reviews = getDueCards(deckId);
  const reviewCount = Math.min(reviews.length, limits.review - progress.review_count);
  
  // Check new limit (only if review limit not exceeded)
  let newCards = [];
  if (!limits.new_cards_ignore_review_limit || progress.review_count < limits.review) {
    const newCardQueue = getNewCardQueue(deckId);
    const remainingNewSlots = limits.new - progress.new_count;
    newCards = newCardQueue.slice(0, remainingNewSlots);
  }
  
  return {
    reviews: reviews.slice(0, reviewCount),
    newCards,
    limits,
    progress
  };
}
```

### 3.2 Template System Enhancements

#### **Database Schema** (Phase 3 already has this, extend it)
```sql
-- Current card_templates table (from Phase 3)
CREATE TABLE card_templates (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT DEFAULT 'basic',
  front_template TEXT NOT NULL,
  back_template TEXT NOT NULL,
  css TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Extend with:
ALTER TABLE card_templates ADD COLUMN fields JSON;  -- Expected fields: ["question", "answer", "tags"]
ALTER TABLE card_templates ADD COLUMN is_cloze BOOLEAN DEFAULT FALSE;

-- Deck-template association (already exists as deck_templates)
-- Add default template per deck
ALTER TABLE decks ADD COLUMN default_template_id INTEGER REFERENCES card_templates(id);

-- Card-level template override
ALTER TABLE cards ADD COLUMN template_id INTEGER REFERENCES card_templates(id);
```

#### **Predefined Templates to Add**
1. **Basic** (already exists)
2. **Basic (reversed)** - Generate 2 cards
3. **Type in Answer** - Input comparison
4. **Cloze** - Fill-in-blank
5. **Audio** - Audio → Text
6. **Image** - Image → Text

#### **Template Editor Features**
- **Syntax highlighting**: Use CodeMirror or Monaco Editor for HTML/CSS
- **Live preview**: Real-time rendering with sample data
- **Variable autocomplete**: `{{question}}`, `{{answer}}`, `{{tags}}`, etc.
- **Template validation**: Check for required fields, balanced brackets
- **Import/Export**: JSON format for sharing templates

#### **API Endpoints**
```
GET    /api/templates              - List all templates
POST   /api/templates              - Create template
PUT    /api/templates/:id          - Update template
DELETE /api/templates/:id          - Delete template
POST   /api/templates/:id/preview  - Preview with sample data
POST   /api/templates/import       - Import template JSON
GET    /api/templates/export/:id   - Export template JSON
POST   /api/templates/:id/clone    - Clone template
PUT    /api/decks/:id/template     - Set deck default template
POST   /api/cards/apply-template   - Batch apply template to cards
```

### 3.3 UI Components Needed

#### **Settings Page**
- Global limits section (new cards/day, reviews/day)
- Checkbox: "New cards ignore review limit"
- Checkbox: "Limits start from top" (for subdecks)

#### **Deck Options Modal**
- Deck-specific limits (preset | this deck | today only)
- Default template selector
- Learning steps configuration (future)

#### **Daily Progress Widget**
- Today's new cards: X/Y
- Today's reviews: X/Y
- Progress bars
- "Study more" button if under limit

#### **Template Editor**
- Split pane: Editor | Preview
- Syntax highlighting
- Field variable list (clickable insertion)
- Template type selector
- Save/Reset/Clone buttons

---

## Part 4: References

- [ANKI Deck Options](https://docs.ankiweb.net/deck-options.html)
- [ANKI Card Templates](https://docs.ankiweb.net/templates/intro.html)
- [ANKI Field Replacements](https://docs.ankiweb.net/templates/fields.html)
- [FSRS4Anki Wiki](https://github.com/open-spaced-repetition/fsrs4anki/wiki)
- [ANKI Scheduler FAQ](https://faqs.ankiweb.net/the-anki-2.1-scheduler.html)

---

**Next Steps**: 
1. Review this research with the team
2. Proceed to Design phase (database schema, API design, UI mockups)
3. Implement in Iteration 2
