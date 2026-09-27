const { query } = require('../config/db');
const env = require('../config/env');
const planRepository = require('../repositories/planRepository');

async function getTenantPlanLimits(tenantId) {
  // 1. Fetch tenant created_at, plan_id, and lifecycle flags
  const { rows } = await query(
    'SELECT plan_id, created_at, is_suspended, is_paused, trial_extended_days, plan_expires_at FROM tenants WHERE id = $1',
    [tenantId]
  );
  const tenant = rows[0];

  // If agency account is suspended by Super Admin -> Full lockout!
  if (tenant?.is_suspended) {
    return {
      id: 'SUSPENDED',
      name: 'Account Suspended',
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
      isSuspended: true,
    };
  }

  // If subscription is paused by Super Admin -> Temporary freeze!
  if (tenant?.is_paused) {
    return {
      id: 'PAUSED',
      name: 'Subscription Paused',
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
      isPaused: true,
    };
  }

  // Determine trial / plan expiration time:
  // If an explicit plan_expires_at is set (by Super Admin or billing), respect it!
  // Otherwise calculate from created_at + (defaultTrialDays + trial_extended_days).
  let trialEndTime;
  if (tenant?.plan_expires_at) {
    trialEndTime = new Date(tenant.plan_expires_at).getTime();
  } else {
    const totalTrialDays = Number(env.defaultTrialDays || 30) + (Number(tenant?.trial_extended_days) || 0);
    const createdTime = tenant?.created_at ? new Date(tenant.created_at).getTime() : Date.now();
    trialEndTime = createdTime + (totalTrialDays * 24 * 60 * 60 * 1000);
  }

  const isWithinTrial = Date.now() < trialEndTime;
  const trialDaysLeft = Math.max(0, Math.ceil((trialEndTime - Date.now()) / (24 * 60 * 60 * 1000)));

  // If currently within Free Trial -> unlock PRO features!
  if (isWithinTrial && (!tenant?.plan_id || tenant.plan_id === 'FREE' || tenant.plan_id === 'TRIAL')) {
    return {
      id: 'TRIAL',
      name: `Pro Trial (${trialDaysLeft}d left)`,
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
      trialDaysLeft,
      expiresAt: tenant?.plan_expires_at || new Date(trialEndTime).toISOString(),
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
      expiresAt: tenant?.plan_expires_at || new Date(trialEndTime).toISOString(),
    };
  }

  const plan = await planRepository.getTenantPlan(tenantId);

  // A paid plan whose month has run out is locked exactly like a lapsed
  // trial. Until plan_expires_at existed there was nothing to check here: one
  // payment bought the plan for good.
  if (!plan || plan.plan_has_expired) {
    return {
      id: 'EXPIRED',
      name: plan ? 'Subscription Expired' : 'Trial Expired',
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
      // Which plan lapsed, so the paywall can offer to renew that one rather
      // than making them pick again from scratch.
      lapsedPlanId: plan?.id || null,
      expiresAt: plan?.plan_expires_at || null,
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
    isTrial: false,
    isExpired: false,
    expiresAt: plan.plan_expires_at || null,
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
