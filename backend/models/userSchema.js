/**
 * Maps between the Postgres `tenants` table rows and the camelCase user
 * object used throughout the app. Keeping this mapping in one place means
 * the rest of the codebase never has to think about snake_case columns.
 */

function rowToUser(row) {
  if (!row) return null;
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
    resetOTP: row.reset_otp || '',
    resetOTPExpiry: row.reset_otp_expiry ? new Date(row.reset_otp_expiry).toISOString() : '',
    createdAt: row.created_at,
  };
}

module.exports = { rowToUser };
