const superAdminService = require('../services/superAdminService');

async function getStats(req, res, next) {
  try {
    const stats = await superAdminService.getStats();
    res.json({ success: true, stats });
  } catch (err) {
    next(err);
  }
}

async function listTenants(req, res, next) {
  try {
    const { search, status, page, limit } = req.query;
    const result = await superAdminService.listTenants({
      search,
      status,
      page: Number(page) || 1,
      limit: Number(limit) || 50,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function getTenantDetails(req, res, next) {
  try {
    const { id } = req.params;
    const tenant = await superAdminService.getTenantDetails(id);
    res.json({ success: true, tenant });
  } catch (err) {
    next(err);
  }
}

async function createTenant(req, res, next) {
  try {
    const { email, password, name, companyName } = req.body;
    const user = await superAdminService.createTenant({ email, password, name, companyName }, req.user);
    res.status(201).json({
      success: true,
      message: `Agency "${user.companyName}" created.`,
      tenant: {
        tenantId: user.tenantId,
        email: user.email,
        name: user.name,
        role: user.role,
        companyName: user.companyName,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function updatePlan(req, res, next) {
  try {
    const { id } = req.params;
    const { planId, planExpiresAt, trialExtendedDays, isPaused } = req.body;
    const updated = await superAdminService.updateTenantPlan(
      id,
      { planId, planExpiresAt, trialExtendedDays, isPaused },
      req.user
    );
    res.json({ success: true, message: 'Agency subscription updated.', tenant: updated });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { id } = req.params;
    const { name, companyName, email, phone, adminNotes } = req.body;
    const updated = await superAdminService.updateTenantProfile(
      id,
      { name, companyName, email, phone, adminNotes },
      req.user
    );
    res.json({ success: true, message: 'Agency profile updated.', tenant: updated });
  } catch (err) {
    next(err);
  }
}

async function toggleSuspension(req, res, next) {
  try {
    const { id } = req.params;
    const { isSuspended } = req.body;
    const updated = await superAdminService.setTenantSuspended(id, isSuspended, req.user);
    res.json({
      success: true,
      message: `Agency account ${isSuspended ? 'suspended' : 'unsuspended'} successfully.`,
      tenant: updated,
    });
  } catch (err) {
    next(err);
  }
}

async function impersonate(req, res, next) {
  try {
    const { id } = req.params;
    const sessionData = await superAdminService.impersonateTenant(id, req.user);
    res.json({
      success: true,
      message: 'Impersonation session created.',
      ...sessionData,
    });
  } catch (err) {
    next(err);
  }
}

async function deleteTenant(req, res, next) {
  try {
    const { id } = req.params;
    const deleted = await superAdminService.deleteTenant(id, req.user);
    res.json({
      success: true,
      message: `Agency "${deleted.company_name}" has been permanently deleted.`,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStats,
  listTenants,
  getTenantDetails,
  createTenant,
  updatePlan,
  updateProfile,
  toggleSuspension,
  impersonate,
  deleteTenant,
};
