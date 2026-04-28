// scheduler.js - Review scheduler using FSRS
const Storage = require('./storage');
const fsrs = require('./fsrs');

const Scheduler = {
  // Check for due cards (optionally by deck)
  checkDueCards(deckId = null) {
    const cards = Storage.getDueCards(deckId);
    return {
      count: cards.length,
      cards
    };
  },
  
  // Get next card for review
  getNextCard(deckId = null) {
    const cards = Storage.getDueCards(deckId);
    return cards.length > 0 ? cards[0] : null;
  },
  
  // Process a review rating
  processReview(cardId, ratingValue) {
    const card = Storage.getCard(cardId);
    if (!card) {
      return { error: 'Card not found' };
    }
    
    // Convert db card to FSRS card
    const fsrsCard = fsrs.dbToCard(card);
    
    // Get scheduling result
    const result = fsrs.repeat(fsrsCard, ratingValue);
    
    if (!result) {
      return { error: 'Failed to process review' };
    }
    
    // Update card in database
    const now = new Date();
    Storage.updateCard(cardId, {
      due_date: result.due_date,
      interval: result.interval,
      ease_factor: result.ease_factor,
      repetitions: result.repetitions,
      lapses: result.lapses,
      state: result.state,
      last_review: now.toISOString()
    });
    
    // Format next interval
    let nextInterval;
    if (result.interval < 1) {
      nextInterval = `${Math.round(result.interval * 24)} 小时`;
    } else if (result.interval < 30) {
      nextInterval = `${Math.round(result.interval)} 天`;
    } else if (result.interval < 365) {
      nextInterval = `${Math.round(result.interval / 30)} 个月`;
    } else {
      nextInterval = `${Math.round(result.interval / 365)} 年`;
    }
    
    return {
      nextInterval,
      interval: result.interval,
      ease_factor: result.ease_factor
    };
  },
  
  // Get preview intervals for a card
  getPreviewIntervals(cardId, ratingValue) {
    const card = Storage.getCard(cardId);
    if (!card) {
      return null;
    }
    return fsrs.previewIntervals(card, ratingValue);
  },
  
  // Get statistics (optionally by deck)
  getStats(deckId = null) {
    return {
      total: Storage.getTotalCount(deckId),
      due: Storage.getDueCount(deckId),
      reviewed: Storage.getReviewedCount(deckId),
      new: Storage.getNewCount(deckId),
      learning: Storage.getLearningCount(deckId),
      avgEase: Math.round(Storage.getAvgEase(deckId) * 100) / 100
    };
  },
  
  // Deck operations
  getAllDecks() {
    return Storage.getAllDecks();
  },
  
  createDeck(name, description) {
    return Storage.createDeck(name, description);
  },
  
  updateDeck(id, name, description) {
    return Storage.updateDeck(id, name, description);
  },
  
  deleteDeck(id) {
    return Storage.deleteDeck(id);
  }
};

module.exports = Scheduler;
