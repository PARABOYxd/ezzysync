const superAdminRepo = require('../repositories/superAdminRepository');
const tokenService = require('./tokenService');
const userService = require('./userService');
const { rowToUser } = require('../models/userSchema');
const logger = require('../utils/logger').child({ module: 'superAdmin' });

async function getStats() {
  return await superAdminRepo.getStats();
}

async function listTenants(params) {
  return await superAdminRepo.listTenants(params);
}

async function getTenantDetails(tenantId) {
  const details = await superAdminRepo.getTenantDetails(tenantId);
  if (!details) {
    const err = new Error('Agency not found');
    err.status = 404;
    throw err;
  }
  return details;
}

/**
 * Creates a new agency with its ADMIN login, skipping the email OTP that
 * self-signup requires. Goes through userService.createUser so the tenant,
 * user and settings rows come out exactly as a normal registration would.
 */
async function createTenant(payload, adminUser) {
  const user = await userService.createUser(payload);
  logger.info({
    admin: adminUser.email,
    tenantId: user.tenantId,
    email: user.email,
  }, 'Super Admin created agency account');
  return user;
}

async function updateTenantPlan(tenantId, payload, adminUser) {
  const updated = await superAdminRepo.updateTenantPlan(tenantId, payload);
  if (!updated) {
    const err = new Error('Agency not found or no changes provided');
    err.status = 404;
    throw err;
  }
  logger.info({
    admin: adminUser.email,
    tenantId,
    changes: payload,
  }, 'Super Admin updated tenant plan');
  return updated;
}

async function updateTenantProfile(tenantId, payload, adminUser) {
  const updated = await superAdminRepo.updateTenantProfile(tenantId, payload);
  if (!updated) {
    const err = new Error('Agency not found or no changes provided');
    err.status = 404;
    throw err;
  }
  logger.info({
    admin: adminUser.email,
    tenantId,
    changes: payload,
  }, 'Super Admin updated tenant company profile');
  return updated;
}

async function setTenantSuspended(tenantId, isSuspended, adminUser) {
  const updated = await superAdminRepo.setTenantSuspended(tenantId, isSuspended);
  if (!updated) {
    const err = new Error('Agency not found');
    err.status = 404;
    throw err;
  }
  logger.warn({
    admin: adminUser.email,
    tenantId,
    isSuspended,
  }, `Super Admin ${isSuspended ? 'SUSPENDED' : 'UNSUSPENDED'} tenant`);
  return updated;
}

async function impersonateTenant(tenantId, adminUser) {
  const userRow = await superAdminRepo.getPrimaryAdminUser(tenantId);
  if (!userRow) {
    const err = new Error('No primary administrator found for this agency.');
    err.status = 404;
    throw err;
  }

  const user = rowToUser(userRow);
  const tokenPair = await tokenService.issueTokenPair(user);

  logger.warn({
    superAdmin: adminUser.email,
    targetTenantId: tenantId,
    targetUserEmail: user.email,
  }, 'Super Admin impersonated agency account');

  return {
    ...tokenPair,
    user: {
      userId: user.userId,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role,
      companyName: user.companyName,
      planId: user.planId,
    },
    impersonatedBy: adminUser.email,
  };
}

async function deleteTenant(tenantId, adminUser) {
  const deleted = await superAdminRepo.deleteTenant(tenantId);
  if (!deleted) {
    const err = new Error('Agency not found');
    err.status = 404;
    throw err;
  }
  logger.warn({
    admin: adminUser.email,
    deletedAgency: deleted,
  }, 'Super Admin PERMANENTLY DELETED agency account');
  return deleted;
}

module.exports = {
  getStats,
  listTenants,
  getTenantDetails,
  createTenant,
  updateTenantPlan,
  updateTenantProfile,
  setTenantSuspended,
  impersonateTenant,
  deleteTenant,
};
