const env = require('../config/env');

function rowToUser(row) {
  if (!row) return null;
  const emailLower = (row.email || '').toLowerCase();
  const isSuperAdmin =
    row.is_super_admin === true ||
    row.role === 'SUPER_ADMIN' ||
    (env.superAdminEmails && env.superAdminEmails.includes(emailLower));

  return {
    userId: row.id,
    tenantId: row.tenant_id,
    email: row.email,
    passwordHash: row.password_hash,
    name: row.name,
    role: row.role || 'ADMIN',
    permissions: row.permissions || null,
    companyName: row.company_name || '',
    planId: row.plan_id || 'FREE',
    planExpiresAt: row.plan_expires_at ? new Date(row.plan_expires_at).toISOString() : null,
    resetOTP: row.reset_otp || '',
    resetOTPExpiry: row.reset_otp_expiry ? new Date(row.reset_otp_expiry).toISOString() : '',
    createdAt: row.created_at,
    isSuperAdmin: Boolean(isSuperAdmin),
  };
}

module.exports = { rowToUser };
