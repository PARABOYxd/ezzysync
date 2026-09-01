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

    let metaStatus = 'APPROVED';
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
  syncTemplates,
  deleteTemplate,
};
