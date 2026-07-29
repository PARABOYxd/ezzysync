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

module.exports = { getSettings, updateSettings, getPublicLeadKey, regeneratePublicLeadKey };
