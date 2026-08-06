const { query } = require('../config/db');

async function insertRefreshToken(userId, tenantId, tokenHash, expiresAt) {
  const { rows } = await query(
    `INSERT INTO refresh_tokens (user_id, tenant_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, tenantId, tokenHash, expiresAt]
  );
  return rows[0];
}

async function findValidRefreshToken(tokenHash) {
  const { rows } = await query(
    `SELECT * FROM refresh_tokens
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`,
    [tokenHash]
  );
  return rows[0];
}

async function revokeRefreshToken(tokenHash) {
  await query(`UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1`, [tokenHash]);
}

module.exports = { insertRefreshToken, findValidRefreshToken, revokeRefreshToken };
