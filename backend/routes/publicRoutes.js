const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { publicLimiter } = require('../middleware/rateLimiter');
const ctrl = require('../controllers/publicController');

const router = express.Router();

/**
 * Tenant-scoped lead capture for agencies' own marketing sites/landing
 * pages (distinct from the /walkthrough endpoint below, which is
 * EzzySync's own demo-request funnel, not a per-tenant feature).
 * publicLeadKey is a rotatable public identifier - never the internal
 * tenant UUID - looked up via Settings > Lead Capture.
 */
router.post('/leads/:publicLeadKey', publicLimiter, ctrl.captureLead);

// Public submission endpoint for marketing site
router.post('/walkthrough', publicLimiter, ctrl.submitWalkthroughRequest);

const env = require('../config/env');

// Public features config endpoint
router.get('/features', (req, res) => {
  res.json({ features: env.features });
});

module.exports = router;
