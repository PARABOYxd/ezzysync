const planRepository = require('../repositories/planRepository');

async function getTenantPlanLimits(tenantId) {
  const plan = await planRepository.getTenantPlan(tenantId);
  if (!plan) {
    // Default fallback to Free Plan if not found
    return {
      id: 'FREE',
      name: 'Free Plan',
      maxBookings: -1,
      maxTeamMembers: -1,
      canDownloadInvoice: true,
      canSendWhatsapp: true,
      canConnectGmail: true,
      canViewAuditLogs: true,
      canExportReports: true,
      canUseAi: false,
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
