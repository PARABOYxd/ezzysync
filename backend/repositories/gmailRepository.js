const db = require('../config/db');

async function upsertConnection({ tenantId, googleEmail, refreshTokenEncrypted }) {
  const result = await db.query(
    `INSERT INTO gmail_connections (
       tenant_id, google_email, refresh_token_encrypted, connected, last_sync_at
     ) VALUES ($1,$2,$3,true,NOW())
     ON CONFLICT (tenant_id) DO UPDATE SET
       google_email = EXCLUDED.google_email,
       refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
       connected = true,
       updated_at = NOW(),
       last_sync_at = NOW()
     RETURNING *`,
    [tenantId, googleEmail, refreshTokenEncrypted]
  );
  return result.rows[0];
}

async function getConnectionByTenant(tenantId) {
  const result = await db.query(
    `SELECT * FROM gmail_connections WHERE tenant_id = $1 AND connected = true`,
    [tenantId]
  );
  return result.rows[0];
}

module.exports = {
  upsertConnection,
  getConnectionByTenant,
};
