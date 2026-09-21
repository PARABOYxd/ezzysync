const express = require('express');
const ctrl = require('../controllers/settingsController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireAdmin, requirePermission } = require('../middleware/permissionMiddleware');

const router = express.Router();
router.use(requireAuth);
router.get('/', ctrl.getSettings);
// Admin-only. It also accepted `canManageSettings`, a legacy flag that
// normalizePermissions never produces, so no team member could ever pass it.
router.put('/', requireAdmin, ctrl.updateSettings);

router.get('/lead-capture-key', ctrl.getPublicLeadKey);
router.post('/lead-capture-key/regenerate', (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Access denied. Admin permission required.' });
  }
  next();
}, ctrl.regeneratePublicLeadKey);

// WhatsApp own number setup request
router.post('/whatsapp-request', ctrl.requestWhatsappSetup);

// WhatsApp 1-Click Embedded Signup & Disconnect
// Connecting or unlinking the agency's number stops or redirects every
// agent's inbox at once - the `whatsapp.manage` decision, not something any
// logged-in team member should be able to do from a script.
router.post('/whatsapp/embedded-signup', requirePermission('whatsapp', 'manage'), ctrl.connectWhatsappEmbedded);
router.post('/whatsapp/disconnect', requirePermission('whatsapp', 'manage'), ctrl.disconnectWhatsapp);

module.exports = router;
