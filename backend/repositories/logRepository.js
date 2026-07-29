const { query } = require('../config/db');

/** JSON.stringify that never throws on circular refs - swaps repeats for '[Circular]' instead of losing the whole log row. utils/logger.js already strips the common offenders (raw req/res), this is a defense-in-depth backstop for anything else unexpected. */
function safeStringify(value) {
  const seen = new WeakSet();
  return JSON.stringify(value, (_key, val) => {
    if (typeof val === 'object' && val !== null) {
      if (seen.has(val)) return '[Circular]';
      seen.add(val);
    }
    return val;
  });
}

/**
 * Persists one warn/error-level application log line to app_logs.
 * Called from utils/logger.js's pino hook - never let a DB hiccup here
 * take down request handling, so callers should treat this as fire-and-forget.
 */
async function createLog({ tenantId, userId, level, message, context, reqId }) {
  const { rows } = await query(
    `INSERT INTO app_logs (tenant_id, user_id, level, message, context, req_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [tenantId || null, userId || null, level, message, safeStringify(context || {}), reqId || null]
  );
  return rows[0];
}

async function listLogs(tenantId, { level, limit = 200 } = {}) {
  const params = [tenantId];
  let where = 'WHERE tenant_id = $1';
  if (level) {
    params.push(level);
    where += ` AND level = $${params.length}`;
  }
  params.push(limit);
  const { rows } = await query(
    `SELECT * FROM app_logs
     ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params
  );
  return rows;
}

async function deleteLogsOlderThanDays(days) {
  const { rowCount } = await query(
    `DELETE FROM app_logs WHERE created_at < now() - interval '1 day' * $1`,
    [days]
  );
  return rowCount;
}

module.exports = {
  createLog,
  listLogs,
  deleteLogsOlderThanDays,
};
