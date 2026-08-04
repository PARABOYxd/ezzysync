const express = require('express');
const ctrl = require('../controllers/invoiceController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

const router = express.Router();
router.use(requireAuth);

router.get('/:bookingId/download', requirePermission('invoices', 'download'), ctrl.download);
router.post('/:bookingId/email', requirePermission('invoices', 'email'), ctrl.sendByEmail);
module.exports = router;
