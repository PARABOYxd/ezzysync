const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const planService = require('../services/planService');
const planRepository = require('../repositories/planRepository');

const router = express.Router();
router.use(requireAuth);

/**
 * The tenant's plan limits alongside what they have actually used.
 *
 * Before this existed the frontend had no way to read a plan, so Sidebar,
 * DashboardLayout, Profile and Team each hardcoded their own rules off the
 * planId string - which is why they drifted apart and one of them ended up
 * showing "Trial Expired" over a live paid plan. Everything plan-related
 * should read from here instead of re-deriving it.
 */
router.get('/me', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const limits = await planService.getTenantPlanLimits(tenantId);

    const [seatsUsed, bookingsUsed] = await Promise.all([
      planRepository.countTeamMembers(tenantId),
      planRepository.countActiveBookings(tenantId),
    ]);

    res.json({
      plan: {
        id: limits.id,
        name: limits.name,
        isTrial: limits.isTrial === true,
        // Paid plans have no end date in the schema, so absent means "not
        // expired" rather than "unknown".
        isExpired: limits.isExpired === true,
      },
      limits: {
        maxTeamMembers: limits.maxTeamMembers,
        maxBookings: limits.maxBookings,
        canUseAi: limits.canUseAi,
        canDownloadInvoice: limits.canDownloadInvoice,
        canSendWhatsapp: limits.canSendWhatsapp,
        canConnectGmail: limits.canConnectGmail,
        canViewAuditLogs: limits.canViewAuditLogs,
        canExportReports: limits.canExportReports,
      },
      usage: {
        teamMembers: seatsUsed,
        bookings: bookingsUsed,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
