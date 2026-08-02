const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const settingsRepository = require('../repositories/settingsRepository');
const { rowToUser } = require('../models/userSchema');

// rowToUser includes passwordHash/resetOTP/resetOTPExpiry because internal
// auth flows (verifyPassword, resetPasswordWithOTP) need them - but
// createTeamMember/updateTeamMember hand their return value straight back
// to the client as the API response, so those fields have to be stripped
// before this leaves the service layer.
function stripSecrets(user) {
  if (!user) return user;
  const { passwordHash, resetOTP, resetOTPExpiry, ...safe } = user;
  return safe;
}

async function findUserByEmail(email) {
  const row = await userRepository.findUserByEmail(email);
  return rowToUser(row);
}

async function findUserById(userId) {
  const row = await userRepository.findUserById(userId);
  return rowToUser(row);
}

async function createUser({ email, password, name, companyName }) {
  const existing = await findUserByEmail(email);
  if (existing) {
    const err = new Error('An account with this email already exists.');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // 1. Create tenant row
  const tenantRow = await userRepository.insertTenant(email, passwordHash, name, companyName);

  // 2. Create primary ADMIN user row
  const userRow = await userRepository.insertUser(tenantRow.id, email, passwordHash, name, 'ADMIN');

  // Join the user row with tenant details
  const joinedUser = {
    ...userRow,
    company_name: tenantRow.company_name
  };
  const user = rowToUser(joinedUser);

  // 3. Seed settings
  await settingsRepository.ensureRow(user.tenantId);
  await settingsRepository.updateSettings(user.tenantId, 'company_name = $1', [companyName], 2);

  return user;
}

async function findOrCreateGoogleUser({ email, name, googleId }) {
  // 1. Try finding by Google ID
  let userRow = await userRepository.findUserByGoogleId(googleId);
  if (userRow) {
    return rowToUser(userRow);
  }

  // 2. Try finding by Email to link Google account to existing user
  userRow = await userRepository.findUserByEmail(email);
  if (userRow) {
    // Link Google ID to existing user
    const updated = await userRepository.linkGoogleAccount(userRow.id, googleId);
    return rowToUser({ ...updated, company_name: userRow.company_name, plan_id: userRow.plan_id });
  }

  // 3. If neither, register new tenant + admin user via Google
  const companyName = `${name}'s Agency`;
  const tenantRow = await userRepository.insertTenant(email, null, name, companyName);
  
  const insertedUser = await userRepository.insertGoogleUser(tenantRow.id, email, name, 'ADMIN', googleId);
  
  const joinedUser = {
    ...insertedUser,
    company_name: tenantRow.company_name,
    plan_id: 'FREE'
  };
  const user = rowToUser(joinedUser);

  // Seed settings
  await settingsRepository.ensureRow(user.tenantId);
  await settingsRepository.updateSettings(user.tenantId, 'company_name = $1', [companyName], 2);

  return user;
}

async function verifyPassword(user, plainPassword) {
  return bcrypt.compare(plainPassword, user.passwordHash);
}

async function setResetOTP(email, otp, expiryISOString) {
  return userRepository.updateUserOTP(email, otp, expiryISOString);
}

async function resetPasswordWithOTP(email, otp, newPassword) {
  const user = await findUserByEmail(email);
  if (!user) {
    const err = new Error('No account found for this email.');
    err.status = 404;
    throw err;
  }

  const isExpired = !user.resetOTPExpiry || new Date(user.resetOTPExpiry) < new Date();
  if (!user.resetOTP || user.resetOTP !== otp || isExpired) {
    const err = new Error('Invalid or expired OTP.');
    err.status = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await userRepository.updateUserPassword(email, passwordHash);
  return true;
}

async function updateProfile(userId, tenantId, updates) {
  let resolvedUserId = userId;

  // Fallback: If userId equals tenantId (old token format), resolve actual admin user ID
  if (userId === tenantId) {
    const adminUser = await userRepository.findUserById(userId);
    if (adminUser) resolvedUserId = adminUser.id || adminUser.userId;
  }

  // Update users table fields
  const userFields = [];
  const userValues = [];
  let userIdx = 1;

  if (updates.name) {
    userFields.push(`name = $${userIdx++}`);
    userValues.push(updates.name);
  }
  if (updates.newPasswordHash) {
    userFields.push(`password_hash = $${userIdx++}`);
    userValues.push(updates.newPasswordHash);
  }

  if (userFields.length > 0) {
    await userRepository.updateUserProfileFields(resolvedUserId, userFields.join(', '), userValues, userIdx);
  }

  // Update tenants table fields if companyName changed
  if (updates.companyName) {
    await userRepository.updateTenantCompany(tenantId, updates.companyName);
  }

  return findUserById(resolvedUserId);
}

async function getTenantEmail(tenantId) {
  const user = await userRepository.findUserById(tenantId);
  if (!user) {
    const err = new Error("Tenant not found.");
    err.status = 404;
    throw err;
  }
  return user.email;
}

async function listUsersByTenant(tenantId) {
  const rows = await userRepository.listUsersByTenant(tenantId);
  return rows.map((r) => ({
    userId: r.id,
    tenantId: r.tenant_id,
    email: r.email,
    name: r.name,
    role: r.role,
    permissions: r.permissions || {},
    createdAt: r.created_at,
    totalLeads: parseInt(r.total_leads || 0, 10),
    wonLeads: parseInt(r.won_leads || 0, 10),
  }));
}

async function createTeamMember(tenantId, { email, password, name, role, permissions }) {
  const existing = await findUserByEmail(email);
  if (existing) {
    const err = new Error('A user with this email already exists.');
    err.status = 409;
    throw err;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const row = await userRepository.insertTeamMember(tenantId, email, passwordHash, name, role, permissions);
  return stripSecrets(rowToUser(row));
}

async function updateTeamMember(tenantId, userId, updates) {
  const fields = [];
  const values = [];
  let idx = 1;

  if (updates.name) {
    fields.push(`name = $${idx++}`);
    values.push(updates.name);
  }
  if (updates.role) {
    fields.push(`role = $${idx++}`);
    values.push(updates.role);
  }
  if (updates.permissions) {
    fields.push(`permissions = $${idx++}`);
    values.push(JSON.stringify(updates.permissions));
  }
  if (updates.password) {
    const passwordHash = await bcrypt.hash(updates.password, 10);
    fields.push(`password_hash = $${idx++}`);
    values.push(passwordHash);
  }

  if (fields.length === 0) return stripSecrets(await findUserById(userId));

  const row = await userRepository.updateTeamMember(userId, tenantId, fields.join(', '), values, idx, idx + 1);
  if (!row) {
    const err = new Error('User not found.');
    err.status = 404;
    throw err;
  }
  return stripSecrets(rowToUser(row));
}

async function deleteTeamMember(tenantId, userId) {
  const ok = await userRepository.deleteTeamMember(tenantId, userId);
  if (!ok) {
    const err = new Error('User not found.');
    err.status = 404;
    throw err;
  }
  return true;
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  verifyPassword,
  setResetOTP,
  resetPasswordWithOTP,
  updateProfile,
  getTenantEmail,
  listUsersByTenant,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  findOrCreateGoogleUser,
};
