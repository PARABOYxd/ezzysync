const settingsService = require('../services/settingsService');

async function getSettings(req, res, next) {
  try {
    const settings = await settingsService.getSettings(req.user.tenantId);
    res.json({ settings });
  } catch (err) {
    next(err);
  }
}

async function updateSettings(req, res, next) {
  try {
    const settings = await settingsService.updateSettings(req.user.tenantId, req.body);
    res.json({ settings });
  } catch (err) {
    next(err);
  }
}

async function getPublicLeadKey(req, res, next) {
  try {
    const publicLeadKey = await settingsService.getPublicLeadKey(req.user.tenantId);
    res.json({ publicLeadKey });
  } catch (err) {
    next(err);
  }
}

async function regeneratePublicLeadKey(req, res, next) {
  try {
    const publicLeadKey = await settingsService.regeneratePublicLeadKey(req.user.tenantId);
    res.json({ publicLeadKey });
  } catch (err) {
    next(err);
  }
}

async function requestWhatsappSetup(req, res, next) {
  try {
    const { phone, companyName } = req.body;
    if (!phone || !companyName) {
      return res.status(400).json({ message: 'Phone and company name are required.' });
    }
    await settingsService.requestWhatsappSetup(req.user.tenantId, { phone, companyName });
    res.json({ message: 'WhatsApp setup request submitted successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSettings, updateSettings, getPublicLeadKey, regeneratePublicLeadKey, requestWhatsappSetup };
