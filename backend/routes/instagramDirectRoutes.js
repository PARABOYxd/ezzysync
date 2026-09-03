const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/instagramDirectController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

router.use(requireAuth);

router.post('/login', requirePermission('settings', 'update'), ctrl.login);
router.post('/verify', requirePermission('settings', 'update'), ctrl.verifyCode);
router.get('/status', requirePermission('settings', 'read'), ctrl.getStatus);
router.post('/disconnect', requirePermission('settings', 'update'), ctrl.disconnect);

module.exports = router;
