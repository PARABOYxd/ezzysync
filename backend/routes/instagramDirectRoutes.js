const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/instagramDirectController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/permissionMiddleware');

router.use(requireAuth);

// Connecting the agency's Instagram account is an owner decision, like the
// rest of Settings. There is no `settings` module in the permission matrix,
// so the previous settings.read/update gate was admin-only in practice anyway.
router.post('/login', requireAdmin, ctrl.login);
router.post('/verify', requireAdmin, ctrl.verifyCode);
router.get('/status', requireAdmin, ctrl.getStatus);
router.post('/disconnect', requireAdmin, ctrl.disconnect);

module.exports = router;
