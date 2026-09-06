const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const planService = require('../services/planService');
const planRepository = require('../repositories/planRepository');
const { getPlanCatalog } = require('../config/planCatalog');

const router = express.Router();

/**
 * What the plans cost and what each one includes.
 *
 * Deliberately above `requireAuth`: the trial-expired paywall renders for a
 * user whose session is technically fine, but the landing site has no session
 * at all, and pricing is public information either way. Nothing tenant-
 * specific is in the response - that is what `/me` below is for.
 *
 * Every price shown anywhere in the app comes from here, so a card can never
 * advertise a number that differs from the one Razorpay charges.
 */
router.get('/catalog', (req, res) => {
  // Prices change rarely; a short cache keeps the paywall instant without
  // pinning a stale price for long after an actual change.
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ plans: getPlanCatalog() });
});

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
        isExpired: limits.isExpired === true,
        // When the current paid month runs out. Null on a trial, which ends by
        // account age rather than by a stored date.
        expiresAt: limits.expiresAt || null,
        // Set only when a paid plan has lapsed, so the paywall can offer to
        // renew the plan they had instead of asking them to choose again.
        lapsedPlanId: limits.lapsedPlanId || null,
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
