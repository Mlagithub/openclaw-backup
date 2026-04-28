// Daily Limits Module - ANKI-style daily card limits
// Usage: const dailyLimits = require('./daily-limits')(db);

module.exports = function(db) {
  return {
    /**
     * Get global limit settings
     */
    getGlobalLimits() {
      try {
        const settings = db.prepare(`
          SELECT daily_new_limit, daily_review_limit, new_cards_ignore_review_limit
          FROM settings WHERE key = 'global'
        `).get();
        
        return {
          daily_new_limit: settings?.daily_new_limit ?? 20,
          daily_review_limit: settings?.daily_review_limit ?? 9999,
          new_cards_ignore_review_limit: settings?.new_cards_ignore_review_limit ?? false
        };
      } catch (error) {
        // Fallback if columns don't exist yet
        return {
          daily_new_limit: 20,
          daily_review_limit: 9999,
          new_cards_ignore_review_limit: false
        };
      }
    },

    /**
     * Update global limit settings
     */
    setGlobalLimits(data) {
      const { daily_new_limit, daily_review_limit, new_cards_ignore_review_limit } = data;
      
      // First ensure the settings row exists
      db.prepare(`
        INSERT INTO settings (key, value) VALUES ('global', '{}')
        ON CONFLICT(key) DO NOTHING
      `).run();
      
      // Update individual settings
      if (daily_new_limit !== undefined) {
        db.prepare(`
          INSERT INTO settings (key, value) VALUES ('daily_new_limit', ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `).run(String(daily_new_limit));
      }
      
      if (daily_review_limit !== undefined) {
        db.prepare(`
          INSERT INTO settings (key, value) VALUES ('daily_review_limit', ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `).run(String(daily_review_limit));
      }
      
      if (new_cards_ignore_review_limit !== undefined) {
        db.prepare(`
          INSERT INTO settings (key, value) VALUES ('new_cards_ignore_review_limit', ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `).run(String(new_cards_ignore_review_limit ? '1' : '0'));
      }
      
      return this.getGlobalLimits();
    },

    /**
     * Get effective limits for a deck (deck-specific or global)
     */
    getDeckLimits(deckId) {
      const global = this.getGlobalLimits();
      
      try {
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
        const newLimit = deckLimits.new_limit_today ?? deckLimits.new_limit ?? global.daily_new_limit;
        const reviewLimit = deckLimits.review_limit_today ?? deckLimits.review_limit ?? global.daily_review_limit;
        
        return {
          deck_id: deckId,
          new_limit: deckLimits.new_limit,
          review_limit: deckLimits.review_limit,
          new_limit_today: deckLimits.new_limit_today,
          review_limit_today: deckLimits.review_limit_today,
          new_cards_ignore_review_limit: deckLimits.new_cards_ignore_review_limit ?? global.new_cards_ignore_review_limit,
          effective_new_limit: newLimit,
          effective_review_limit: reviewLimit
        };
      } catch (error) {
        // Table might not exist yet
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
    },

    /**
     * Set deck-specific limits
     */
    setDeckLimits(deckId, data) {
      const { new_limit, review_limit, new_limit_today, review_limit_today, new_cards_ignore_review_limit } = data;
      
      try {
        // Normalize values
        const norm_new = new_limit !== undefined ? new_limit : null;
        const norm_review = review_limit !== undefined ? review_limit : null;
        const norm_new_today = new_limit_today !== undefined ? new_limit_today : null;
        const norm_review_today = review_limit_today !== undefined ? review_limit_today : null;
        const norm_ignore = new_cards_ignore_review_limit ? 1 : 0;
        
        // Check if record exists
        const existing = db.prepare('SELECT deck_id FROM deck_limits WHERE deck_id = ?').get(deckId);
        
        if (existing) {
          db.prepare(`
            UPDATE deck_limits 
            SET new_limit = ?, review_limit = ?, 
                new_limit_today = ?, review_limit_today = ?,
                new_cards_ignore_review_limit = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE deck_id = ?
          `).run(
            norm_new,
            norm_review,
            norm_new_today,
            norm_review_today,
            norm_ignore,
            deckId
          );
        } else {
          db.prepare(`
            INSERT INTO deck_limits (deck_id, new_limit, review_limit, new_limit_today, review_limit_today, new_cards_ignore_review_limit)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(
            deckId,
            new_limit ?? null,
            review_limit ?? null,
            new_limit_today ?? null,
            review_limit_today ?? null,
            new_cards_ignore_review_limit ?? false
          );
        }
        
        return this.getDeckLimits(deckId);
      } catch (error) {
        throw new Error('Failed to set deck limits: ' + error.message);
      }
    },

    /**
     * Get today's progress
     */
    getTodayProgress() {
      const today = new Date().toISOString().split('T')[0];
      
      try {
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
      } catch (error) {
        // Table might not exist yet
        return { date: today, new_count: 0, review_count: 0 };
      }
    },

    /**
     * Increment progress counters
     */
    incrementProgress(cardType) {
      const today = new Date().toISOString().split('T')[0];
      const column = cardType === 'new' ? 'new_count' : 'review_count';
      
      try {
        db.prepare(`
          UPDATE daily_progress 
          SET ${column} = ${column} + 1, last_updated = CURRENT_TIMESTAMP
          WHERE date = ?
        `).run(today);
      } catch (error) {
        // Silently fail if table doesn't exist
        console.warn('Could not increment progress:', error.message);
      }
    },

    /**
     * Get cards to study today (respecting limits)
     */
    getTodaysCards(deckId = null) {
      const progress = this.getTodayProgress();
      const limits = deckId ? this.getDeckLimits(deckId) : this.getGlobalLimits();
      
      // Get review cards
      let reviewQuery = "SELECT * FROM cards WHERE due_date <= datetime('now')";
      const params = [];
      if (deckId) {
        reviewQuery += ' AND deck_id = ?';
        params.push(deckId);
      }
      reviewQuery += ' ORDER BY due_date ASC, queue_position ASC';
      
      const allReviews = db.prepare(reviewQuery).all(...params);
      const reviewRemaining = Math.max(0, limits.effective_review_limit - progress.review_count);
      const reviews = allReviews.slice(0, reviewRemaining);
      
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
        const newRemaining = Math.max(0, limits.effective_new_limit - progress.new_count);
        newCards = allNew.slice(0, newRemaining);
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
        queue_complete: reviews.length < allReviews.length
      };
    },

    /**
     * Reset daily progress
     */
    resetProgress(date, options = {}) {
      const { reset_new = true, reset_review = true } = options;
      
      const updates = [];
      if (reset_new) updates.push('new_count = 0');
      if (reset_review) updates.push('review_count = 0');
      
      if (updates.length === 0) return;
      
      try {
        db.prepare(`
          UPDATE daily_progress 
          SET ${updates.join(', ')}, last_updated = CURRENT_TIMESTAMP
          WHERE date = ?
        `).run(date);
      } catch (error) {
        throw new Error('Failed to reset progress: ' + error.message);
      }
    },

    /**
     * Clear expired today-only limits
     */
    clearExpiredTodayLimits() {
      const today = new Date().toISOString().split('T')[0];
      
      try {
        db.prepare(`
          UPDATE deck_limits 
          SET new_limit_today = NULL, review_limit_today = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE updated_at < datetime(?)
        `).run(today);
      } catch (error) {
        // Silently fail
      }
    }
  };
};
