const express = require('express');
const ctrl = require('../controllers/customerController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

const router = express.Router();
router.use(requireAuth);

router.get('/', requirePermission('customers', 'read'), ctrl.list);
router.get('/:id', requirePermission('customers', 'read'), ctrl.getOne);

module.exports = router;
