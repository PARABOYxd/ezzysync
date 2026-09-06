const gmailRepository = require('../repositories/gmailRepository');
const { rowToGmailConnection } = require('../models/gmailConnectionModel');
const { decrypt } = require('../utils/encryption');
const logger = require('../utils/logger').child({ module: 'gmail' });

async function upsertConnection({ tenantId, googleEmail, refreshTokenEncrypted }) {
  const row = await gmailRepository.upsertConnection({ tenantId, googleEmail, refreshTokenEncrypted });
  return rowToGmailConnection(row);
}

async function getConnectionByTenant(tenantId) {
  const row = await gmailRepository.getConnectionByTenant(tenantId);
  return rowToGmailConnection(row);
}

/**
 * Unlinks the tenant's Gmail account.
 *
 * There was no way to do this at all: WhatsApp and Instagram both had a
 * disconnect, Gmail had only a connect. A tenant who linked the wrong mailbox,
 * or simply changed their mind, had no way to make us stop holding a live
 * refresh token for their inbox.
 *
 * Two steps, in this order:
 *
 * 1. Ask Google to revoke the token, so the grant disappears from the tenant's
 *    Google Account too and the token is dead even if a copy leaked. Google
 *    answers 400 for a token that is already invalid, which is a fine outcome
 *    here - the goal is that it stops working, and it has.
 * 2. Delete our row regardless of what Google said. If revocation failed
 *    because Google was unreachable, keeping the credential on our side would
 *    be the worse outcome; the tenant asked us to let go of it.
 */
async function disconnect(tenantId) {
  const connection = await getConnectionByTenant(tenantId);

  if (connection?.refreshTokenEncrypted) {
    try {
      const refreshToken = decrypt(connection.refreshTokenEncrypted);
      const response = await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: refreshToken }).toString(),
      });
      if (!response.ok) {
        logger.warn({ tenantId, status: response.status }, 'Google declined to revoke the token; deleting it locally anyway');
      }
    } catch (err) {
      // Includes a decrypt failure, which is exactly the case where the stored
      // value is useless and most deserves deleting.
      logger.warn({ tenantId, err }, 'Could not revoke the Google token; deleting it locally anyway');
    }
  }

  const removed = await gmailRepository.deleteConnection(tenantId);
  logger.info({ tenantId, wasConnected: Boolean(removed) }, 'Gmail disconnected');

  return { disconnected: true, googleEmail: removed?.google_email || null };
}

module.exports = {
  upsertConnection,
  getConnectionByTenant,
  disconnect,
};
