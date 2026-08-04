const express = require('express');
const ctrl = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

const router = express.Router();

router.get('/', requireAuth, ctrl.getDashboard);
router.get('/analytics', requireAuth, requirePermission('billing', 'read'), ctrl.getBillingAnalytics);

module.exports = router;
