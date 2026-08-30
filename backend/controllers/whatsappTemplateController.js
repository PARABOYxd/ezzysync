const templateRepo = require('../repositories/whatsappTemplateRepository');

async function getTemplates(req, res, next) {
  try {
    const templates = await templateRepo.getTemplates(req.user.tenantId);
    res.json({ templates });
  } catch (err) {
    next(err);
  }
}

async function createTemplate(req, res, next) {
  try {
    const { type, name, body, languageCode } = req.body;
    if (!name || !body) {
      return res.status(400).json({ message: 'Name and body are required.' });
    }

    const template = await templateRepo.createTemplate(req.user.tenantId, {
      type,
      name,
      body,
      languageCode,
    });

    res.json({ message: 'Template saved successfully.', template });
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
  createTemplate,
  deleteTemplate,
};
