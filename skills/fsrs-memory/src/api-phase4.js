// Phase 4 API Extensions - Daily Limits & Template Enhancements
module.exports = function setupPhase4API(app, db) {
  const dailyLimits = require('./daily-limits')(db);
  const templateManager = require('./template-manager')(db);
  
  // ==================== Daily Limits API ====================
  
  // Get global limits
  app.get('/api/settings/limits', (req, res) => {
    try {
      const limits = dailyLimits.getGlobalLimits();
      res.json({ success: true, data: limits });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Update global limits
  app.put('/api/settings/limits', (req, res) => {
    try {
      const { daily_new_limit, daily_review_limit, new_cards_ignore_review_limit } = req.body;
      const limits = dailyLimits.setGlobalLimits({
        daily_new_limit,
        daily_review_limit,
        new_cards_ignore_review_limit
      });
      res.json({ success: true, data: limits });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Get deck-specific limits
  app.get('/api/decks/:id/limits', (req, res) => {
    try {
      const limits = dailyLimits.getDeckLimits(parseInt(req.params.id));
      res.json({ success: true, data: limits });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Set deck-specific limits
  app.put('/api/decks/:id/limits', (req, res) => {
    try {
      const { new_limit, review_limit, new_limit_today, review_limit_today, new_cards_ignore_review_limit } = req.body;
      console.log('Deck limits request:', req.params.id, { new_limit, review_limit, new_cards_ignore_review_limit });
      const limits = dailyLimits.setDeckLimits(parseInt(req.params.id), {
        new_limit,
        review_limit,
        new_limit_today,
        review_limit_today,
        new_cards_ignore_review_limit
      });
      res.json({ success: true, data: limits });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Get today's progress
  app.get('/api/daily/progress', (req, res) => {
    try {
      const progress = dailyLimits.getTodayProgress();
      const limits = dailyLimits.getGlobalLimits();
      
      res.json({
        success: true,
        data: {
          ...progress,
          new_limit: limits.daily_new_limit,
          review_limit: limits.daily_review_limit,
          new_remaining: Math.max(0, limits.daily_new_limit - progress.new_count),
          review_remaining: Math.max(0, limits.daily_review_limit - progress.review_count)
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Reset daily progress (admin)
  app.post('/api/daily/reset', (req, res) => {
    try {
      const { date, reset_new, reset_review } = req.body;
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      dailyLimits.resetProgress(targetDate, { reset_new, reset_review });
      res.json({ success: true, message: 'Progress reset successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Get today's cards queue
  app.get('/api/queue/today', (req, res) => {
    try {
      const { deck_id, type } = req.query;
      const deckId = deck_id ? parseInt(deck_id) : null;
      
      const queue = dailyLimits.getTodaysCards(deckId);
      
      // Filter by type if specified
      if (type === 'new') {
        queue.review_cards = [];
      } else if (type === 'review') {
        queue.new_cards = [];
      }
      
      res.json({ success: true, data: queue });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ==================== Enhanced Template API ====================
  
  // Get all templates (extended from Phase 3)
  app.get('/api/templates', (req, res) => {
    try {
      const templates = templateManager.getAllTemplates();
      res.json({ success: true, data: templates });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Create template (extended from Phase 3)
  app.post('/api/templates', (req, res) => {
    try {
      const template = templateManager.createTemplate(req.body);
      res.json({ success: true, data: template });
    } catch (error) {
      if (error.message.includes('UNIQUE')) {
        return res.status(400).json({ success: false, error: 'Template name already exists' });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Update template (extended from Phase 3)
  app.put('/api/templates/:id', (req, res) => {
    try {
      const template = templateManager.updateTemplate(parseInt(req.params.id), req.body);
      res.json({ success: true, data: template });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Delete template (extended from Phase 3)
  app.delete('/api/templates/:id', (req, res) => {
    try {
      templateManager.deleteTemplate(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('default')) {
        return res.status(400).json({ success: false, error: error.message });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Preview template (enhanced from Phase 3)
  app.post('/api/templates/:id/preview', (req, res) => {
    try {
      const { fields } = req.body;
      const preview = templateManager.previewTemplate(parseInt(req.params.id), fields);
      res.json({ success: true, data: preview });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Clone template (new)
  app.post('/api/templates/:id/clone', (req, res) => {
    try {
      const { new_name } = req.body;
      if (!new_name) {
        return res.status(400).json({ success: false, error: 'new_name is required' });
      }
      
      const template = templateManager.cloneTemplate(parseInt(req.params.id), new_name);
      res.json({ success: true, data: template });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Export template (new)
  app.get('/api/templates/export/:id', (req, res) => {
    try {
      const exported = templateManager.exportTemplate(parseInt(req.params.id));
      res.json({ success: true, data: exported });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Import template (new)
  app.post('/api/templates/import', (req, res) => {
    try {
      const template = templateManager.importTemplate(req.body);
      res.json({ success: true, data: template });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Set deck default template (new)
  app.put('/api/decks/:id/template', (req, res) => {
    try {
      const { template_id } = req.body;
      if (!template_id) {
        return res.status(400).json({ success: false, error: 'template_id is required' });
      }
      
      templateManager.setDeckTemplate(parseInt(req.params.id), parseInt(template_id));
      res.json({ success: true, message: 'Deck template updated' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Apply template to cards (new)
  app.post('/api/cards/apply-template', (req, res) => {
    try {
      const { template_id, deck_id, card_ids } = req.body;
      if (!template_id || !deck_id) {
        return res.status(400).json({ success: false, error: 'template_id and deck_id are required' });
      }
      
      const result = templateManager.applyToCards(
        parseInt(template_id),
        parseInt(deck_id),
        card_ids
      );
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Initialize default templates on startup
  console.log('Initializing default templates...');
  templateManager.initializeDefaultTemplates();
};
