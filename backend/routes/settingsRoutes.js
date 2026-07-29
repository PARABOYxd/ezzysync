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

module.exports = router;
