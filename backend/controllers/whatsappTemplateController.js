const templateRepo = require('../repositories/whatsappTemplateRepository');
const settingsService = require('../services/settingsService');
const whatsappMetaService = require('../services/whatsappMetaService');

async function getTemplates(req, res, next) {
  try {
    const templates = await templateRepo.getTemplates(req.user.tenantId);
    res.json({ templates });
  } catch (err) {
    next(err);
  }
}

async function lookupTemplate(req, res, next) {
  try {
    const { name } = req.query;
    if (!name) return res.json({ exists: false });

    const settings = await settingsService.getSettings(req.user.tenantId);
    const lookup = await whatsappMetaService.lookupMetaTemplate(settings, name);
    res.json(lookup);
  } catch (err) {
    next(err);
  }
}

async function createTemplate(req, res, next) {
  try {
    const { type, name, body, languageCode, category, variablesMap, submitToMeta } = req.body;
    if (!name || !body) {
      return res.status(400).json({ message: 'Name and body are required.' });
    }

    let metaStatus = submitToMeta === false ? 'DRAFT' : 'APPROVED';
    let wabaTemplateId = null;
    let finalName = name;

    // If it's a Meta template and submitToMeta is true, attempt direct submission to Meta Graph API
    if (type === 'template' && submitToMeta !== false) {
      const settings = await settingsService.getSettings(req.user.tenantId);
      try {
        const metaRes = await whatsappMetaService.createMetaTemplate(settings, {
          name,
          category: category || 'UTILITY',
          language_code: languageCode || 'en_US',
          body
        });
        wabaTemplateId = metaRes.wabaTemplateId;
        metaStatus = metaRes.status || 'PENDING';
        if (metaRes.cleanName) {
          finalName = metaRes.cleanName;
        }
      } catch (metaErr) {
        // Check if template already exists on Meta. If so, import details gracefully
        const lookup = await whatsappMetaService.lookupMetaTemplate(settings, name);
        if (lookup.exists) {
          wabaTemplateId = lookup.template.id;
          metaStatus = lookup.template.status || 'APPROVED';
          finalName = lookup.template.name;
        } else {
          return res.status(metaErr.status || 400).json({
            message: metaErr.message || 'Failed to submit template to Meta API.'
          });
        }
      }
    }

    const template = await templateRepo.createTemplate(req.user.tenantId, {
      type,
      name: finalName,
      body,
      languageCode,
      category: category || 'UTILITY',
      metaStatus: type === 'text' ? 'APPROVED' : metaStatus,
      wabaTemplateId,
      variablesMap
    });

    res.json({ message: 'Template saved successfully.', template });
  } catch (err) {
    next(err);
  }
}

async function updateTemplate(req, res, next) {
  try {
    const { id } = req.params;
    const { type, name, body, languageCode, category, variablesMap, submitToMeta } = req.body;

    const existing = await templateRepo.getTemplateById(req.user.tenantId, id);
    if (!existing) {
      return res.status(404).json({ message: 'Template not found.' });
    }

    let metaStatus = submitToMeta === false ? 'DRAFT' : 'PENDING';
    let wabaTemplateId = existing.waba_template_id;

    if (type === 'template' && submitToMeta !== false) {
      const settings = await settingsService.getSettings(req.user.tenantId);
      try {
        const metaRes = await whatsappMetaService.createMetaTemplate(settings, {
          name: existing.name || name,
          category: category || 'UTILITY',
          language_code: languageCode || 'en_US',
          body
        });
        wabaTemplateId = metaRes.wabaTemplateId || wabaTemplateId;
        metaStatus = metaRes.status || 'PENDING';
      } catch (metaErr) {
        return res.status(metaErr.status || 400).json({
          message: metaErr.message || 'Failed to update template on Meta API.'
        });
      }
    }

    const updated = await templateRepo.updateTemplateRecord(req.user.tenantId, id, {
      type: type || existing.type,
      name: existing.name || name,
      body: body || existing.body,
      languageCode: languageCode || existing.language_code,
      category: category || existing.category,
      metaStatus: type === 'text' ? 'APPROVED' : metaStatus,
      wabaTemplateId,
      variablesMap: variablesMap || existing.variables_map
    });

    res.json({ message: 'Template updated successfully.', template: updated });
  } catch (err) {
    next(err);
  }
}

async function submitMetaTemplate(req, res, next) {
  try {
    const { id } = req.params;
    const template = await templateRepo.getTemplateById(req.user.tenantId, id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found.' });
    }

    const settings = await settingsService.getSettings(req.user.tenantId);
    const metaRes = await whatsappMetaService.createMetaTemplate(settings, {
      name: template.name,
      category: template.category || 'UTILITY',
      language_code: template.language_code || 'en_US',
      body: template.body
    });

    const updated = await templateRepo.updateMetaStatus(req.user.tenantId, id, {
      metaStatus: metaRes.status || 'PENDING',
      wabaTemplateId: metaRes.wabaTemplateId
    });

    res.json({ message: 'Template submitted to Meta successfully!', template: updated });
  } catch (err) {
    next(err);
  }
}

async function syncTemplates(req, res, next) {
  try {
    const settings = await settingsService.getSettings(req.user.tenantId);
    const result = await whatsappMetaService.syncMetaTemplates(settings, req.user.tenantId);
    const templates = await templateRepo.getTemplates(req.user.tenantId);

    res.json({
      message: `Synced ${result.syncedCount || 0} template status(es) from Meta!`,
      templates
    });
  } catch (err) {
    next(err);
  }
}

async function deleteTemplate(req, res, next) {
  try {
    const { id } = req.params;
    const deleted = await templateRepo.deleteTemplate(req.user.tenantId, id);
    if (!deleted) {
      return res.status(404).json({ message: 'Template not found.' });
    }
    res.json({ message: 'Template deleted successfully.', template: deleted });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTemplates,
  lookupTemplate,
  createTemplate,
  updateTemplate,
  submitMetaTemplate,
  syncTemplates,
  deleteTemplate,
};
