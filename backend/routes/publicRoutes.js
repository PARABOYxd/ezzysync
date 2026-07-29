const express = require('express');
const { query } = require('../config/db');
const { requireAuth } = require('../middleware/authMiddleware');
const { publicLimiter } = require('../middleware/rateLimiter');
const settingsRepository = require('../repositories/settingsRepository');
const leadService = require('../services/leadService');

const router = express.Router();

/**
 * Tenant-scoped lead capture for agencies' own marketing sites/landing
 * pages (distinct from the /walkthrough endpoint above, which is
 * JourneyFlow's own demo-request funnel, not a per-tenant feature).
 * publicLeadKey is a rotatable public identifier - never the internal
 * tenant UUID - looked up via Settings > Lead Capture.
 */
router.post('/leads/:publicLeadKey', publicLimiter, async (req, res, next) => {
  try {
    const { customerName, email, phone, interest } = req.body;
    if (!customerName || !phone) {
      return res.status(400).json({ message: 'Name and phone number are required.' });
    }
    if (!/^[0-9+\-\s()]{7,15}$/.test(phone)) {
      return res.status(400).json({ message: 'Please provide a valid phone number.' });
    }

    const tenantId = await settingsRepository.getTenantIdByPublicLeadKey(req.params.publicLeadKey);
    if (!tenantId) {
      return res.status(404).json({ message: 'Invalid lead capture link.' });
    }

    const lead = await leadService.createLead(tenantId, {
      customerName, email, phone, interest, source: 'Landing Page',
    }, 'Landing Page Widget');

    res.status(201).json({ message: 'Thank you! We will get back to you shortly.', leadId: lead.leadId });
  } catch (err) {
    next(err);
  }
});

// Public submission endpoint for marketing site
router.post('/walkthrough', publicLimiter, async (req, res, next) => {
  try {
    const { name, agencyName, email, phone } = req.body;
    if (!name || !agencyName || !email) {
      return res.status(400).json({ message: 'Name, Agency Name, and Email are required.' });
    }

    const { rows } = await query(
      `INSERT INTO walkthrough_requests (name, agency_name, email, phone)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, agencyName, email, phone || '']
    );

    res.status(201).json({ message: 'Request submitted successfully!', request: rows[0] });
  } catch (err) {
    next(err);
  }
});

// Authenticated endpoint for Admin dashboard check
router.get('/walkthrough', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden. Admin access required.' });
    }
    const { rows } = await query(
      `SELECT * FROM walkthrough_requests ORDER BY created_at DESC`
    );
    res.json({ requests: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
