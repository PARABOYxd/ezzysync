const settingsRepository = require('../repositories/settingsRepository');
const { rowToSettings, COLUMN_MAP, SECRET_KEYS, SECRET_PLACEHOLDER } = require('../models/settingsSchema');

/**
 * Settings as the API returns them: credentials masked.
 *
 * Use this for anything that reaches a browser.
 */
async function getSettings(tenantId) {
  await settingsRepository.ensureRow(tenantId);
  const row = await settingsRepository.getSettings(tenantId);
  return rowToSettings(row);
}

/**
 * Settings including live credentials, for server-side use only - sending to
 * Meta, syncing templates, downloading media. Never return the result of this
 * from an HTTP handler.
 */
async function getSettingsWithSecrets(tenantId) {
  await settingsRepository.ensureRow(tenantId);
  const row = await settingsRepository.getSettings(tenantId);
  return rowToSettings(row, { includeSecrets: true });
}

async function updateSettings(tenantId, updates) {
  await settingsRepository.ensureRow(tenantId);

  const fields = [];
  const values = [];
  let i = 1;

  for (const [key, value] of Object.entries(updates)) {
    const column = COLUMN_MAP[key];
    if (!column) continue;

    // The form posts back everything it was given, including the masked
    // placeholder standing in for a stored credential. Writing that through
    // would replace a working access token with a row of dots, so an
    // unchanged secret is skipped and the stored value survives.
    if (SECRET_KEYS.includes(key) && value === SECRET_PLACEHOLDER) continue;

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
  getSettingsWithSecrets,
  getSettings,
  updateSettings,
  getPublicLeadKey,
  regeneratePublicLeadKey,
  requestWhatsappSetup,
};
