// fsrs.js - Complete FSRS implementation using official ts-fsrs library
const { createEmptyCard, fsrs, generatorParameters, Rating, State } = require('ts-fsrs');

// Create FSRS instance with default parameters
const f = fsrs();

const FSRSEngine = {
  // Rating enum - map to ts-fsrs Rating
  Rating: {
    Again: Rating.Again,
    Hard: Rating.Hard,
    Good: Rating.Good,
    Easy: Rating.Easy
  },
  
  // State enum - map to ts-fsrs State
  State: {
    New: State.New,
    Learning: State.Learning,
    Review: State.Review,
    Relearning: State.Relearning
  },
  
  // Normalize state value to standard string
  normalizeState(dbState, repetitions) {
    // Handle undefined, null, or empty states
    if (!dbState || dbState === '') {
      return 'new';
    }
    
    // Handle numeric states (convert to string)
    const stateStr = String(dbState).trim();
    
    // Handle "2.0" or "2" which means Review
    if (stateStr === '2.0' || stateStr === '2') {
      return 'review';
    }
    
    // Handle "1.0" or "1" which means Learning  
    if (stateStr === '1.0' || stateStr === '1') {
      return 'learning';
    }
    
    // Handle "3.0" or "3" which means Relearning
    if (stateStr === '3.0' || stateStr === '3') {
      return 'relearning';
    }
    
    // Handle "0" or "0.0" which means New
    if (stateStr === '0' || stateStr === '0.0') {
      return 'new';
    }
    
    // Handle string states
    const validStates = ['new', 'learning', 'review', 'relearning'];
    if (validStates.includes(stateStr.toLowerCase())) {
      return stateStr.toLowerCase();
    }
    
    // Default: if repetitions is 0, treat as new
    if (!repetitions || repetitions === 0) {
      return 'new';
    }
    
    // Otherwise treat as review
    return 'review';
  },
  
  // Convert database card to FSRS Card object
  dbToCard(dbCard) {
    const now = new Date();
    
    // Use createEmptyCard as base, then apply database values
    const card = createEmptyCard(now);
    
    // Set initial values with defaults
    card.difficulty = dbCard.ease_factor || 2.5;
    card.reps = dbCard.repetitions || 0;
    card.lapses = dbCard.lapses || 0;
    
    // For ts-fsrs, we need to restore the card state from database
    // Normalize state before mapping
    const normalizedState = this.normalizeState(dbCard.state, dbCard.repetitions);
    
    // Map normalized state to ts-fsrs State
    switch (normalizedState) {
      case 'new':
        card.state = State.New;
        card.due = now; // New cards are due immediately
        card.stability = 0;
        card.elapsed_days = 0;
        break;
      case 'learning':
        card.state = State.Learning;
        card.due = dbCard.due_date ? new Date(dbCard.due_date) : now;
        card.stability = 0;
        card.elapsed_days = 0;
        break;
      case 'relearning':
        card.state = State.Relearning;
        card.due = dbCard.due_date ? new Date(dbCard.due_date) : now;
        card.stability = 0;
        card.elapsed_days = 0;
        break;
      case 'review':
      default:
        card.state = State.Review;
        // For review cards, set due date properly
        if (dbCard.due_date) {
          card.due = new Date(dbCard.due_date);
        } else {
          card.due = now;
        }
        
        // Use the interval directly as stability approximation
        // This is more accurate than interval * ease_factor
        // FSRS stability represents how stable the memory is
        const interval = dbCard.interval || 0;
        card.stability = Math.max(0.1, interval);
        
        // Calculate elapsed_days from last_review or due_date
        if (dbCard.last_review) {
          card.last_review = new Date(dbCard.last_review);
          card.elapsed_days = Math.max(0, (now - card.last_review) / (1000 * 60 * 60 * 24));
        } else if (dbCard.due_date) {
          // If no last_review but has due_date, calculate from due_date
          card.elapsed_days = Math.max(0, (now - card.due) / (1000 * 60 * 60 * 24));
        } else {
          card.elapsed_days = 0;
        }
        break;
    }
    
    // Set last_review if available
    if (dbCard.last_review) {
      card.last_review = new Date(dbCard.last_review);
    }
    
    return card;
  },
  
  // Process a review and return scheduling info
  repeat(card, ratingValue) {
    const now = new Date();
    
    // Map rating 1-5 to FSRS Rating
    let rating;
    let perfectBonus = 1.0; // Default no bonus
    switch(ratingValue) {
      case 1: rating = Rating.Again; break;
      case 2: rating = Rating.Hard; break;
      case 3: rating = Rating.Good; break;
      case 4: rating = Rating.Easy; break;
      case 5: 
        rating = Rating.Easy; 
        perfectBonus = 1.3; // 30% bonus for Perfect
        break;
      default: rating = Rating.Good;
    }
    
    // Get scheduling result using ts-fsrs
    const result = f.repeat(card, now);
    const scheduling = result[rating];
    
    if (!scheduling) {
      console.error('Scheduling not found for rating:', rating);
      return null;
    }
    
    // Calculate interval
    // Note: ts-fsrs has an issue with Learning -> Review transitions where
    // scheduled_days can be NaN. We need to handle this case.
    let dueDate;
    let intervalDays;
    
    const scheduledDays = scheduling.card.scheduled_days;
    const logScheduledDays = scheduling.log.scheduled_days;
    
    // Check if scheduled_days is valid (not NaN)
    if (!isNaN(scheduledDays) && scheduledDays !== undefined && scheduledDays > 0) {
      // Use scheduled_days from card to calculate interval
      intervalDays = scheduledDays;
      dueDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    } else if (!isNaN(logScheduledDays) && logScheduledDays > 0) {
      // Use scheduled_days from log
      intervalDays = logScheduledDays;
      dueDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    } else {
      // Special handling for Learning/Relearning -> Review transitions
      // When rated Good or Easy, the card graduates to Review with a minimum interval
      if ((card.state === State.Learning || card.state === State.Relearning) && 
          (ratingValue >= 3)) {
        // Graduate to Review: minimum 1 day for Good, 4 days for Easy
        if (ratingValue === 3) {
          intervalDays = 1;  // Good graduates to 1 day
        } else if (ratingValue === 4) {
          intervalDays = 4;  // Easy graduates to 4 days
        } else if (ratingValue === 5) {
          intervalDays = 7;  // Perfect graduates to 7 days
        }
        dueDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
      } else {
        // For other cases (learning steps), use due date or current time + minimum
        dueDate = new Date(scheduling.card.due);
        if (isNaN(dueDate.getTime())) {
          // Invalid date, use now + 1 minute
          dueDate = new Date(now.getTime() + 60000);
        }
        intervalDays = Math.max(0, (dueDate - now) / (1000 * 60 * 60 * 24));
      }
    }
    
    // Apply Perfect bonus if applicable
    if (perfectBonus > 1.0) {
      intervalDays = intervalDays * perfectBonus;
      dueDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    }
    
    // Ensure minimum interval of 1 minute for learning steps (Again, Hard)
    if (ratingValue <= 2 && intervalDays < 1/24/60) { // Less than 1 minute
      intervalDays = 1/24/60; // Set to 1 minute
      dueDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    }
    
    // Map state to string
    const stateMap = {
      [State.New]: 'new',
      [State.Learning]: 'learning',
      [State.Review]: 'review',
      [State.Relearning]: 'relearning'
    };
    
    // Use higher precision for small intervals (keep 4 decimal places for < 1 day)
    const precision = intervalDays < 1 ? 10000 : 100;
    
    return {
      due_date: dueDate.toISOString(),
      interval: Math.round(intervalDays * precision) / precision,
      ease_factor: scheduling.card.difficulty,
      repetitions: scheduling.card.reps,
      lapses: scheduling.card.lapses,
      state: stateMap[scheduling.card.state] || 'new',
      stability: scheduling.card.stability,
      difficulty: scheduling.card.difficulty
    };
  },
  
  // Calculate preview intervals without modifying card
  previewIntervals(card, ratingValue) {
    const fsrsCard = this.dbToCard(card);
    return this.repeat(fsrsCard, ratingValue);
  }
};

module.exports = FSRSEngine;
