const { query } = require('../config/db');

async function createLog(tenantId, userId, action, details) {
  const { rows } = await query(
    `INSERT INTO audit_logs (tenant_id, user_id, action, details)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [tenantId, userId || null, action, JSON.stringify(details || {})]
  );
  return rows[0];
}

async function listLogs(tenantId) {
  const { rows } = await query(
    `SELECT a.*, u.name as user_name, u.email as user_email
     FROM audit_logs a
     LEFT JOIN users u ON a.user_id = u.id
     WHERE a.tenant_id = $1
     ORDER BY a.created_at DESC
     LIMIT 500`,
    [tenantId]
  );
  return rows;
}

async function deleteLogsOlderThanDays(days) {
  const { rowCount } = await query(
    `DELETE FROM audit_logs
     WHERE created_at < now() - interval '1 day' * $1`,
    [days]
  );
  return rowCount;
}

module.exports = {
  createLog,
  listLogs,
  deleteLogsOlderThanDays,
};
