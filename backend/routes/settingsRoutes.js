const express = require('express');
const ctrl = require('../controllers/settingsController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(requireAuth);
router.get('/', ctrl.getSettings);
router.put('/', (req, res, next) => {
  if (req.user.role !== 'ADMIN' && !req.user.permissions.canManageSettings) {
    return res.status(403).json({ message: 'Access denied. Admin permission required to edit settings.' });
  }
  next();
}, ctrl.updateSettings);

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
router.post('/whatsapp/embedded-signup', ctrl.connectWhatsappEmbedded);
router.post('/whatsapp/disconnect', ctrl.disconnectWhatsapp);

module.exports = router;
