const { query } = require('../config/db');
const logger = require('../utils/logger');

/**
 * Ensures the `instagram_direct_sessions` table exists in PostgreSQL.
 */
async function ensureTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS instagram_direct_sessions (
      tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
      username TEXT,
      account_id TEXT,
      session_data TEXT,
      status TEXT DEFAULT 'disconnected',
      challenge_context JSONB,
      ai_autopilot_enabled BOOLEAN DEFAULT TRUE,
      encrypted_creds TEXT DEFAULT '',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
  try {
    await query(sql);
    // Add encrypted_creds column if table already existed without it
    await query(`ALTER TABLE instagram_direct_sessions ADD COLUMN IF NOT EXISTS encrypted_creds TEXT DEFAULT ''`).catch(() => {});
  } catch (err) {
    logger.error({ err }, '[instagramDirectRepository] Failed to ensure instagram_direct_sessions table');
  }
}

// Auto-run table check on module load
ensureTable().catch(() => {});

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
  ensureTable,
  getSession,
  saveSession,
  updateStatus,
  clearSession,
  listConnectedTenantIds,
};
