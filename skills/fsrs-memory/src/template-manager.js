// Template Manager Module - Enhanced template system
// Usage: const templateManager = require('./template-manager')(db);

module.exports = function(db) {
  return {
    /**
     * Get all templates
     */
    getAllTemplates() {
      try {
        return db.prepare('SELECT * FROM card_templates ORDER BY id').all();
      } catch (error) {
        return [];
      }
    },

    /**
     * Get template by ID
     */
    getTemplate(id) {
      try {
        return db.prepare('SELECT * FROM card_templates WHERE id = ?').get(id);
      } catch (error) {
        return null;
      }
    },

    /**
     * Create new template
     */
    createTemplate(data) {
      const { name, type, front_template, back_template, css, fields, is_cloze, generate_reverse } = data;
      
      if (!name || !front_template || !back_template) {
        throw new Error('Missing required fields: name, front_template, back_template');
      }
      
      try {
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
          JSON.stringify(fields || [{name: 'question'}, {name: 'answer'}]),
          is_cloze ? 1 : 0,
          generate_reverse ? 1 : 0
        );
        
        // Insert field definitions
        if (fields && Array.isArray(fields)) {
          const fieldStmt = db.prepare(`
            INSERT INTO template_fields (template_id, field_name, field_order, field_type, is_required)
            VALUES (?, ?, ?, ?, ?)
          `);
          
          fields.forEach((field, index) => {
            try {
              fieldStmt.run(
                result.lastInsertRowid,
                typeof field === 'string' ? field : field.name,
                index,
                typeof field === 'object' ? (field.type || 'text') : 'text',
                typeof field === 'object' ? (field.required ? 1 : 0) : 1
              );
            } catch (e) {
              // Ignore duplicate field errors
            }
          });
        }
        
        return this.getTemplate(result.lastInsertRowid);
      } catch (error) {
        if (error.message.includes('UNIQUE')) {
          throw new Error('Template name already exists');
        }
        throw error;
      }
    },

    /**
     * Update template
     */
    updateTemplate(id, data) {
      const { name, type, front_template, back_template, css, fields, is_cloze, generate_reverse } = data;
      
      try {
        db.prepare(`
          UPDATE card_templates 
          SET name = ?, type = ?, front_template = ?, back_template = ?, 
              css = ?, fields_json = ?, is_cloze = ?, generate_reverse = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          name, type, front_template, back_template, css,
          JSON.stringify(fields),
          is_cloze ? 1 : 0,
          generate_reverse ? 1 : 0,
          id
        );
        
        // Update field definitions
        if (fields && Array.isArray(fields)) {
          db.prepare('DELETE FROM template_fields WHERE template_id = ?').run(id);
          
          const fieldStmt = db.prepare(`
            INSERT INTO template_fields (template_id, field_name, field_order, field_type, is_required)
            VALUES (?, ?, ?, ?, ?)
          `);
          
          fields.forEach((field, index) => {
            fieldStmt.run(
              id,
              typeof field === 'string' ? field : field.name,
              index,
              typeof field === 'object' ? (field.type || 'text') : 'text',
              typeof field === 'object' ? (field.required ? 1 : 0) : 1
            );
          });
        }
        
        return this.getTemplate(id);
      } catch (error) {
        throw new Error('Failed to update template: ' + error.message);
      }
    },

    /**
     * Delete template
     */
    deleteTemplate(id) {
      const template = this.getTemplate(id);
      if (!template) throw new Error('Template not found');
      if (template.is_default) throw new Error('Cannot delete default template');
      
      try {
        db.prepare('DELETE FROM template_fields WHERE template_id = ?').run(id);
        db.prepare('DELETE FROM card_templates WHERE id = ?').run(id);
      } catch (error) {
        throw new Error('Failed to delete template: ' + error.message);
      }
    },

    /**
     * Clone template
     */
    cloneTemplate(id, newName) {
      const template = this.getTemplate(id);
      if (!template) throw new Error('Template not found');
      
      let fields = [];
      try {
        fields = JSON.parse(template.fields_json || '[]');
        if (!Array.isArray(fields) || fields.length === 0) {
          fields = [{name: 'question'}, {name: 'answer'}];
        }
      } catch (e) {
        fields = [{name: 'question'}, {name: 'answer'}];
      }
      
      return this.createTemplate({
        name: newName,
        type: template.type,
        front_template: template.front_template,
        back_template: template.back_template,
        css: template.css,
        fields: fields,
        is_cloze: template.is_cloze,
        generate_reverse: template.generate_reverse
      });
    },

    /**
     * Preview template rendering
     */
    previewTemplate(id, fields) {
      const template = this.getTemplate(id);
      if (!template) throw new Error('Template not found');
      
      let front = template.front_template;
      let back = template.back_template;
      
      // Replace {{text:Field}} - strip HTML
      for (const [key, value] of Object.entries(fields || {})) {
        const textRegex = new RegExp(`\\{\\{text:${key}\\}\\}`, 'g');
        const textValue = String(value || '').replace(/<[^>]*>/g, '');
        back = back.replace(textRegex, textValue);
      }
      
      // Replace {{Field}} - normal replacement
      for (const [key, value] of Object.entries(fields || {})) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        const htmlValue = String(value || '');
        front = front.replace(regex, htmlValue);
        back = back.replace(regex, htmlValue);
      }
      
      // Handle {{FrontSide}}
      back = back.replace(/{{FrontSide}}/g, front);
      
      // Handle {{Tags}}
      const tagsValue = fields?.tags || '';
      front = front.replace(/{{Tags}}/g, tagsValue);
      back = back.replace(/{{Tags}}/g, tagsValue);
      
      // Handle {{Deck}}
      const deckValue = fields?.deck || 'Default';
      front = front.replace(/{{Deck}}/g, deckValue);
      back = back.replace(/{{Deck}}/g, deckValue);
      
      return {
        front,
        back,
        css: template.css,
        template_name: template.name
      };
    },

    /**
     * Export template as JSON
     */
    exportTemplate(id) {
      const template = this.getTemplate(id);
      if (!template) throw new Error('Template not found');
      
      let fields = [];
      try {
        fields = db.prepare(
          'SELECT field_name, field_order, field_type, is_required FROM template_fields WHERE template_id = ? ORDER BY field_order'
        ).all(id);
      } catch (e) {
        // Use fields_json if template_fields table doesn't exist
        try {
          fields = JSON.parse(template.fields_json || '[]').map((f, i) => ({
            field_name: typeof f === 'string' ? f : f.name,
            field_order: i,
            field_type: typeof f === 'object' ? (f.type || 'text') : 'text',
            is_required: typeof f === 'object' ? (f.required ? 1 : 0) : 1
          }));
        } catch (e2) {
          fields = [];
        }
      }
      
      return {
        name: template.name,
        type: template.type,
        front_template: template.front_template,
        back_template: template.back_template,
        css: template.css,
        fields: fields.map(f => ({
          name: f.field_name,
          type: f.field_type,
          required: !!f.is_required
        })),
        is_cloze: !!template.is_cloze,
        generate_reverse: !!template.generate_reverse,
        version: '1.0',
        exported_at: new Date().toISOString()
      };
    },

    /**
     * Import template from JSON
     */
    importTemplate(json) {
      const { name, type, front_template, back_template, css, fields, is_cloze, generate_reverse } = json;
      
      if (!name || !front_template || !back_template) {
        throw new Error('Missing required template fields');
      }
      
      return this.createTemplate({
        name,
        type: type || 'basic',
        front_template,
        back_template,
        css: css || '',
        fields: fields || [{name: 'question'}, {name: 'answer'}],
        is_cloze: is_cloze || false,
        generate_reverse: generate_reverse || false
      });
    },

    /**
     * Set default template for deck
     */
    setDeckTemplate(deckId, templateId) {
      const template = this.getTemplate(templateId);
      if (!template) throw new Error('Template not found');
      
      try {
        db.prepare('UPDATE decks SET default_template_id = ? WHERE id = ?').run(templateId, deckId);
      } catch (error) {
        throw new Error('Failed to set deck template: ' + error.message);
      }
    },

    /**
     * Apply template to cards
     */
    applyToCards(templateId, deckId, cardIds = null) {
      const template = this.getTemplate(templateId);
      if (!template) throw new Error('Template not found');
      
      try {
        let query;
        let params;
        
        if (cardIds && cardIds.length > 0) {
          const placeholders = cardIds.map(() => '?').join(',');
          query = `UPDATE cards SET template_id = ? WHERE id IN (${placeholders})`;
          params = [templateId, ...cardIds];
        } else {
          query = 'UPDATE cards SET template_id = ? WHERE deck_id = ?';
          params = [templateId, deckId];
        }
        
        const result = db.prepare(query).run(...params);
        return { updated_count: result.changes, deck_id: deckId, template_id: templateId };
      } catch (error) {
        throw new Error('Failed to apply template: ' + error.message);
      }
    },

    /**
     * Initialize default templates
     */
    initializeDefaultTemplates() {
      const defaults = [
        {
          name: 'Basic Card',
          type: 'basic',
          front_template: '{{question}}',
          back_template: '{{FrontSide}}<hr id=answer>{{answer}}',
          css: '.card { font-family: Arial; font-size: 20px; }\n.front { font-weight: bold; }',
          fields: ['question', 'answer'],
          is_cloze: false,
          generate_reverse: false
        },
        {
          name: 'Basic (Reversed)',
          type: 'basic-reverse',
          front_template: '{{question}}',
          back_template: '{{FrontSide}}<hr id=answer>{{answer}}',
          css: '.card { font-family: Arial; font-size: 20px; }',
          fields: ['question', 'answer'],
          is_cloze: false,
          generate_reverse: true
        },
        {
          name: 'Type in Answer',
          type: 'type-answer',
          front_template: '{{question}}<br>{{type:answer}}',
          back_template: '{{FrontSide}}<hr id=answer>{{type:answer}}',
          css: '.card { font-family: Arial; font-size: 20px; }\n#typeans { font-size: 18px; padding: 8px; border: 1px solid #ccc; }',
          fields: ['question', 'answer'],
          is_cloze: false,
          generate_reverse: false
        },
        {
          name: 'Cloze Deletion',
          type: 'cloze',
          front_template: '{{cloze:text}}',
          back_template: '{{cloze:text}}<br>{{extra}}',
          css: '.card { font-family: Arial; font-size: 20px; }\n.cloze { color: #007bff; font-weight: bold; }',
          fields: ['text', 'extra'],
          is_cloze: true,
          generate_reverse: false
        },
        {
          name: 'Audio Card',
          type: 'audio',
          front_template: '{{audio}}',
          back_template: '{{FrontSide}}<hr id=answer>{{text}}',
          css: '.card { font-family: Arial; font-size: 20px; }\naudio { width: 100%; margin: 10px 0; }',
          fields: [{name: 'audio', type: 'audio'}, {name: 'text', type: 'text'}],
          is_cloze: false,
          generate_reverse: false
        },
        {
          name: 'Image Card',
          type: 'image',
          front_template: '<img src="{{image}}" style="max-width: 100%;">',
          back_template: '{{FrontSide}}<hr id=answer>{{text}}',
          css: '.card { font-family: Arial; font-size: 20px; }',
          fields: [{name: 'image', type: 'image'}, {name: 'text', type: 'text'}],
          is_cloze: false,
          generate_reverse: false
        }
      ];
      
      for (const template of defaults) {
        try {
          const existing = db.prepare('SELECT id FROM card_templates WHERE name = ?').get(template.name);
          if (!existing) {
            this.createTemplate(template);
            console.log('Created default template:', template.name);
          }
        } catch (error) {
          console.warn('Could not create default template:', template.name, error.message);
        }
      }
    }
  };
};
