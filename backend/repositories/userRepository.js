const { query } = require('../config/db');

async function findUserByEmail(email) {
  const { rows } = await query(
    `SELECT u.*, t.company_name, t.plan_id
     FROM users u
     JOIN tenants t ON u.tenant_id = t.id
     WHERE u.email = $1`,
    [email.toLowerCase()]
  );
  return rows[0];
}

async function findUserById(userId) {
  const { rows } = await query(
    `SELECT u.*, t.company_name, t.plan_id
     FROM users u
     JOIN tenants t ON u.tenant_id = t.id
     WHERE u.id = $1`,
    [userId]
  );
  if (rows[0]) return rows[0];

  // Fallback for old tokens
  const fallback = await query(
    `SELECT u.*, t.company_name, t.plan_id
     FROM users u
     JOIN tenants t ON u.tenant_id = t.id
     WHERE u.tenant_id = $1 AND u.role = 'ADMIN'
     LIMIT 1`,
    [userId]
  );
  return fallback.rows[0];
}

async function insertTenant(email, passwordHash, name, companyName) {
  const { rows } = await query(
    `INSERT INTO tenants (email, password_hash, name, company_name)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [email.toLowerCase(), passwordHash, name, companyName]
  );
  return rows[0];
}

async function insertUser(tenantId, email, passwordHash, name, role, permissions = null) {
  const { rows } = await query(
    `INSERT INTO users (tenant_id, email, password_hash, name, role, permissions)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [tenantId, email.toLowerCase(), passwordHash, name, role, permissions ? JSON.stringify(permissions) : null]
  );
  return rows[0];
}

async function updateUserOTP(email, otp, expiryISOString) {
  const { rowCount } = await query(
    `UPDATE users SET reset_otp = $1, reset_otp_expiry = $2 WHERE email = $3`,
    [otp, expiryISOString, email.toLowerCase()]
  );
  return rowCount > 0;
}

async function updateUserPassword(email, passwordHash) {
  await query(
    `UPDATE users SET password_hash = $1, reset_otp = NULL, reset_otp_expiry = NULL WHERE email = $2`,
    [passwordHash, email.toLowerCase()]
  );
}

async function updateUserProfileFields(userId, userFieldsSql, userValues, indexPlaceholder) {
  userValues.push(userId);
  const { rows } = await query(
    `UPDATE users SET ${userFieldsSql} WHERE id = $${indexPlaceholder} RETURNING *`,
    userValues
  );
  return rows[0];
}

async function updateTenantCompany(tenantId, companyName) {
  await query(
    `UPDATE tenants SET company_name = $1 WHERE id = $2`,
    [companyName, tenantId]
  );
}

async function listUsersByTenant(tenantId) {
  const { rows } = await query(
    `SELECT u.id, u.tenant_id, u.email, u.name, u.role, u.permissions, u.created_at,
       (SELECT COUNT(*) FROM leads WHERE assigned_to = u.name AND tenant_id = u.tenant_id AND deleted = FALSE) AS total_leads,
       (SELECT COUNT(*) FROM leads WHERE assigned_to = u.name AND tenant_id = u.tenant_id AND stage = 'Won' AND deleted = FALSE) AS won_leads
     FROM users u
     WHERE u.tenant_id = $1
     ORDER BY u.created_at DESC`,
    [tenantId]
  );
  return rows;
}

async function insertTeamMember(tenantId, email, passwordHash, name, role, permissions) {
  const { rows } = await query(
    `INSERT INTO users (tenant_id, email, password_hash, name, role, permissions)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [tenantId, email.toLowerCase(), passwordHash, name, role, JSON.stringify(permissions || {})]
  );
  return rows[0];
}

async function updateTeamMember(userId, tenantId, fieldsSql, values, indexPlaceholder1, indexPlaceholder2) {
  values.push(tenantId);
  values.push(userId);
  const { rows } = await query(
    `UPDATE users
     SET ${fieldsSql}
     WHERE tenant_id = $${indexPlaceholder1} AND id = $${indexPlaceholder2}
     RETURNING *`,
    values
  );
  return rows[0];
}

async function deleteTeamMember(tenantId, userId) {
  const { rowCount } = await query(
    `DELETE FROM users WHERE tenant_id = $1 AND id = $2`,
    [tenantId, userId]
  );
  return rowCount > 0;
}

async function findUserByGoogleId(googleId) {
  const { rows } = await query(
    `SELECT u.*, t.company_name, t.plan_id
     FROM users u
     JOIN tenants t ON u.tenant_id = t.id
     WHERE u.google_id = $1`,
    [googleId]
  );
  return rows[0];
}

async function linkGoogleAccount(userId, googleId) {
  const { rows } = await query(
    `UPDATE users SET google_id = $1 WHERE id = $2 RETURNING *`,
    [googleId, userId]
  );
  return rows[0];
}

async function insertGoogleUser(tenantId, email, name, role, googleId) {
  const { rows } = await query(
    `INSERT INTO users (tenant_id, email, name, role, google_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [tenantId, email.toLowerCase(), name, role, googleId]
  );
  return rows[0];
}

module.exports = {
  findUserByEmail,
  findUserById,
  insertTenant,
  insertUser,
  updateUserOTP,
  updateUserPassword,
  updateUserProfileFields,
  updateTenantCompany,
  listUsersByTenant,
  insertTeamMember,
  updateTeamMember,
  deleteTeamMember,
  findUserByGoogleId,
  linkGoogleAccount,
  insertGoogleUser,
};
