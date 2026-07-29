const gmailRepository = require('../repositories/gmailRepository');
const { rowToGmailConnection } = require('../models/gmailConnectionModel');

async function upsertConnection({ tenantId, googleEmail, refreshTokenEncrypted }) {
  const row = await gmailRepository.upsertConnection({ tenantId, googleEmail, refreshTokenEncrypted });
  return rowToGmailConnection(row);
}

async function getConnectionByTenant(tenantId) {
  const row = await gmailRepository.getConnectionByTenant(tenantId);
  return rowToGmailConnection(row);
}

module.exports = {
  upsertConnection,
  getConnectionByTenant,
};