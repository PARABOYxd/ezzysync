const { query } = require('../config/db');
const logger = require('../utils/logger');

// Schema lives in config/db.js ensureSchema(), with the rest of it.

async function getSession(tenantId) {
  const { rows } = await query(
    `SELECT * FROM instagram_direct_sessions WHERE tenant_id = $1`,
    [tenantId]
  );
  return rows[0] || null;
}

async function saveSession(tenantId, { username, accountId, sessionData, status = 'connected', challengeContext = null, encryptedCreds = null }) {
  // If encryptedCreds is provided, also update it; otherwise keep existing
  if (encryptedCreds !== null) {
    const { rows } = await query(
      `INSERT INTO instagram_direct_sessions (tenant_id, username, account_id, session_data, status, challenge_context, encrypted_creds, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (tenant_id) DO UPDATE SET
         username = EXCLUDED.username,
         account_id = EXCLUDED.account_id,
         session_data = EXCLUDED.session_data,
         status = EXCLUDED.status,
         challenge_context = EXCLUDED.challenge_context,
         encrypted_creds = EXCLUDED.encrypted_creds,
         updated_at = NOW()
       RETURNING *`,
      [tenantId, username || '', accountId || '', sessionData || '', status, challengeContext ? JSON.stringify(challengeContext) : null, encryptedCreds]
    );
    return rows[0];
  } else {
    const { rows } = await query(
      `INSERT INTO instagram_direct_sessions (tenant_id, username, account_id, session_data, status, challenge_context, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (tenant_id) DO UPDATE SET
         username = EXCLUDED.username,
         account_id = EXCLUDED.account_id,
         session_data = EXCLUDED.session_data,
         status = EXCLUDED.status,
         challenge_context = EXCLUDED.challenge_context,
         updated_at = NOW()
       RETURNING *`,
      [tenantId, username || '', accountId || '', sessionData || '', status, challengeContext ? JSON.stringify(challengeContext) : null]
    );
    return rows[0];
  }
}

async function updateStatus(tenantId, status, challengeContext = null) {
  const { rows } = await query(
    `UPDATE instagram_direct_sessions
     SET status = $1, challenge_context = $2, updated_at = NOW()
     WHERE tenant_id = $3
     RETURNING *`,
    [status, challengeContext ? JSON.stringify(challengeContext) : null, tenantId]
  );
  return rows[0];
}

async function clearSession(tenantId) {
  await query(
    `UPDATE instagram_direct_sessions
     SET status = 'disconnected', session_data = '', challenge_context = NULL, updated_at = NOW()
     WHERE tenant_id = $1`,
    [tenantId]
  );
}

async function listConnectedTenantIds() {
  const { rows } = await query(
    `SELECT tenant_id FROM instagram_direct_sessions WHERE status = 'connected' AND session_data != ''`
  );
  return rows.map((r) => r.tenant_id);
}

module.exports = {
  getSession,
  saveSession,
  updateStatus,
  clearSession,
  listConnectedTenantIds,
};
