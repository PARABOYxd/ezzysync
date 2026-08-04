const express = require('express');
const ctrl = require('../controllers/followUpController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

const router = express.Router();
router.use(requireAuth);

router.get('/', requirePermission('followUps', 'read'), ctrl.list);
router.get('/completed', requirePermission('followUps', 'read'), ctrl.listCompleted);
router.patch('/:id/done', requirePermission('followUps', 'update'), ctrl.markDone);

module.exports = router;
