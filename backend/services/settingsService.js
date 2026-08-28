const settingsRepository = require('../repositories/settingsRepository');
const { rowToSettings, COLUMN_MAP } = require('../models/settingsSchema');

async function getSettings(tenantId) {
  await settingsRepository.ensureRow(tenantId);
  const row = await settingsRepository.getSettings(tenantId);
  return rowToSettings(row);
}

async function updateSettings(tenantId, updates) {
  await settingsRepository.ensureRow(tenantId);

  const fields = [];
  const values = [];
  let i = 1;

  for (const [key, value] of Object.entries(updates)) {
    const column = COLUMN_MAP[key];
    if (!column) continue;
    fields.push(`${column} = $${i++}`);
    values.push(value ?? '');
  }

  if (fields.length > 0) {
    await settingsRepository.updateSettings(tenantId, fields.join(', '), values, i);
  }

  return getSettings(tenantId);
}

async function getPublicLeadKey(tenantId) {
  return settingsRepository.getPublicLeadKey(tenantId);
}

async function regeneratePublicLeadKey(tenantId) {
  return settingsRepository.regeneratePublicLeadKey(tenantId);
}

const emailService = require('./emailService');
const { query } = require('../config/db');
const logger = require('../utils/logger').child({ module: 'settingsService' });

async function requestWhatsappSetup(tenantId, { phone, companyName }) {
  await settingsRepository.insertWhatsappSetupRequest(tenantId, phone, companyName);

  let userEmail = '';
  try {
    const userRes = await query('SELECT email FROM users WHERE tenant_id = $1 LIMIT 1', [tenantId]);
    userEmail = userRes.rows[0]?.email || '';
  } catch (e) {}

  emailService.sendWhatsappSetupNotification({
    phone,
    companyName,
    tenantId,
    userEmail
  }).catch((err) => {
    logger.warn({ err }, 'Could not dispatch WhatsApp request email');
  });
}

module.exports = {
  getSettings,
  updateSettings,
  getPublicLeadKey,
  regeneratePublicLeadKey,
  requestWhatsappSetup,
};
