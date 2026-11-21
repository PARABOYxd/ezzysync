const express = require('express');
const ctrl = require('../controllers/leadSheetController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/permissionMiddleware');

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get('/', ctrl.list);
router.post('/preview', ctrl.preview);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.patch('/:id/paused', ctrl.setPaused);
router.post('/:id/sync', ctrl.syncNow);
router.delete('/:id', ctrl.remove);

module.exports = router;
