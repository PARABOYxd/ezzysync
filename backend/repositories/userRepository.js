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

/** Strict lookup by user id, with no ADMIN-by-tenant-id fallback. Callers that
 * want the legacy-token fallback should use findUserById instead. */
async function findUserWithTenantById(userId) {
  const { rows } = await query(
    `SELECT u.*, t.company_name, t.plan_id
     FROM users u
     JOIN tenants t ON u.tenant_id = t.id
     WHERE u.id = $1`,
    [userId]
  );
  return rows[0];
}

async function findUserById(userId) {
  const direct = await findUserWithTenantById(userId);
  if (direct) return direct;

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

/** Tenant-scoped lookup for a team member the caller already knows the id
 * of - unlike findUserById, this never falls back to another tenant's row. */
async function findUserByIdAndTenant(tenantId, userId) {
  const { rows } = await query(
    `SELECT u.*, t.company_name, t.plan_id
     FROM users u
     JOIN tenants t ON u.tenant_id = t.id
     WHERE u.tenant_id = $1 AND u.id = $2`,
    [tenantId, userId]
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

/** assigned_to/team_member are plain TEXT columns matched by name, not a
 * foreign key to users.id - this is how many leads/bookings would go
 * orphaned (unassigned, but silently) if a member were deleted outright. */
async function countAssignedRecords(tenantId, name) {
  const { rows } = await query(
    `SELECT
       (SELECT COUNT(*) FROM leads WHERE tenant_id = $1 AND assigned_to = $2 AND deleted = FALSE) AS lead_count,
       (SELECT COUNT(*) FROM bookings WHERE tenant_id = $1 AND team_member = $2 AND deleted = FALSE) AS booking_count`,
    [tenantId, name]
  );
  const row = rows[0] || {};
  return {
    leadCount: parseInt(row.lead_count || 0, 10),
    bookingCount: parseInt(row.booking_count || 0, 10),
  };
}

/** Keeps existing lead/booking assignments pointed at the right person after
 * a rename, or moves them to a chosen teammate before the old one is
 * deleted - same string-match columns as countAssignedRecords. */
async function reassignTeamMemberName(tenantId, oldName, newName) {
  if (!oldName || !newName || oldName === newName) return;
  await query(
    `UPDATE leads SET assigned_to = $1, updated_at = now() WHERE tenant_id = $2 AND assigned_to = $3`,
    [newName, tenantId, oldName]
  );
  await query(
    `UPDATE bookings SET team_member = $1, updated_at = now() WHERE tenant_id = $2 AND team_member = $3`,
    [newName, tenantId, oldName]
  );
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
  findUserWithTenantById,
  findUserByIdAndTenant,
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
  countAssignedRecords,
  reassignTeamMemberName,
  findUserByGoogleId,
  linkGoogleAccount,
  insertGoogleUser,
};
