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

const env = require('../config/env');
const axios = require('axios');
const logger = require('../utils/logger');

async function connectWhatsappEmbedded(req, res, next) {
  try {
    const { code, accessToken, wabaId, phoneNumberId, whatsappNumber } = req.body;
    let finalToken = accessToken;

    if (code && env.facebook?.appId && env.facebook?.appSecret) {
      try {
        const tokenRes = await axios.get('https://graph.facebook.com/v20.0/oauth/access_token', {
          params: {
            client_id: env.facebook.appId,
            client_secret: env.facebook.appSecret,
            code: code,
          }
        });
        if (tokenRes.data?.access_token) {
          finalToken = tokenRes.data.access_token;
        }
      } catch (tokenErr) {
        logger.warn({ err: tokenErr?.response?.data || tokenErr.message }, '[Embedded Signup] Token exchange fallback');
      }
    }

    const updates = {
      whatsappPhoneNumberId: phoneNumberId || '',
      whatsappAccessToken: finalToken || accessToken || '',
      whatsappWabaId: wabaId || '',
      whatsappNumber: whatsappNumber || '',
    };

    const settings = await settingsService.updateSettings(req.user.tenantId, updates);
    res.json({ message: 'WhatsApp Business connected successfully!', settings });
  } catch (err) {
    next(err);
  }
}

async function disconnectWhatsapp(req, res, next) {
  try {
    const updates = {
      whatsappPhoneNumberId: '',
      whatsappAccessToken: '',
      whatsappWabaId: '',
      whatsappBusinessId: '',
      whatsappNumber: '',
      whatsappAppSecret: ''
    };
    const settings = await settingsService.updateSettings(req.user.tenantId, updates);
    res.json({ message: 'WhatsApp disconnected successfully.', settings });
  } catch (err) {
    next(err);
  }
}

module.exports = { 
  getSettings, 
  updateSettings, 
  getPublicLeadKey, 
  regeneratePublicLeadKey, 
  requestWhatsappSetup,
  connectWhatsappEmbedded,
  disconnectWhatsapp
};
