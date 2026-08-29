const { query } = require('../config/db');
const planRepository = require('../repositories/planRepository');

async function getTenantPlanLimits(tenantId) {
  // 1. Fetch tenant created_at and plan_id
  const { rows } = await query('SELECT plan_id, created_at FROM tenants WHERE id = $1', [tenantId]);
  const tenant = rows[0];

  const trialDays = Number(process.env.DEFAULT_TRIAL_DAYS || 30);
  const createdTime = tenant?.created_at ? new Date(tenant.created_at).getTime() : Date.now();
  const isWithinTrial = (Date.now() - createdTime) < (trialDays * 24 * 60 * 60 * 1000);

  // If currently within 30-day Free Trial -> unlock PRO features!
  if (isWithinTrial && (!tenant?.plan_id || tenant.plan_id === 'FREE' || tenant.plan_id === 'TRIAL')) {
    return {
      id: 'TRIAL',
      name: 'Pro 30-Day Trial',
      maxBookings: -1,
      maxTeamMembers: 5,
      canDownloadInvoice: true,
      canSendWhatsapp: true,
      canConnectGmail: true,
      canViewAuditLogs: true,
      canExportReports: true,
      canUseAi: true,
      isTrial: true,
      isExpired: false,
    };
  }

  // If trial has expired and tenant has not subscribed to any paid plan -> Lockout!
  if (!isWithinTrial && (!tenant?.plan_id || tenant.plan_id === 'FREE' || tenant.plan_id === 'TRIAL')) {
    return {
      id: 'EXPIRED',
      name: 'Trial Expired',
      maxBookings: 0,
      maxTeamMembers: 0,
      canDownloadInvoice: false,
      canSendWhatsapp: false,
      canConnectGmail: false,
      canViewAuditLogs: false,
      canExportReports: false,
      canUseAi: false,
      isTrial: false,
      isExpired: true,
    };
  }

  const plan = await planRepository.getTenantPlan(tenantId);
  if (!plan) {
    return {
      id: 'EXPIRED',
      name: 'Trial Expired',
      maxBookings: 0,
      maxTeamMembers: 0,
      canDownloadInvoice: false,
      canSendWhatsapp: false,
      canConnectGmail: false,
      canViewAuditLogs: false,
      canExportReports: false,
      canUseAi: false,
      isTrial: false,
      isExpired: true,
    };
  }
  return {
    id: plan.id,
    name: plan.name,
    maxBookings: plan.max_bookings,
    maxTeamMembers: plan.max_team_members,
    canDownloadInvoice: plan.can_download_invoice,
    canSendWhatsapp: plan.can_send_whatsapp,
    canConnectGmail: plan.can_connect_gmail,
    canViewAuditLogs: plan.can_view_audit_logs,
    canExportReports: plan.can_export_reports,
    canUseAi: plan.can_use_ai,
  };
}

async function checkFeatureAccess(tenantId, featureKey) {
  const limits = await getTenantPlanLimits(tenantId);
  return !!limits[featureKey];
}

async function checkUsageLimit(tenantId, resource) {
  const limits = await getTenantPlanLimits(tenantId);
  
  if (resource === 'bookings') {
    const limit = limits.maxBookings;
    if (limit === -1) return true; // unlimited
    
    // Count active bookings (excluding deleted ones)
    const count = await planRepository.countActiveBookings(tenantId);
    return count < limit;
  }
  
  if (resource === 'teamMembers') {
    const limit = limits.maxTeamMembers;
    if (limit === -1) return true; // unlimited
    
    // Count total users for this tenant (excluding admins, or just team members)
    // Typically, the admin themselves count, or just extra team members.
    // Let's count users where role = 'TEAM_MEMBER'
    const count = await planRepository.countTeamMembers(tenantId);
    return count < limit;
  }
  
  return true;
}

module.exports = {
  getTenantPlanLimits,
  checkFeatureAccess,
  checkUsageLimit,
};
