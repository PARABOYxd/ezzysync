const express = require('express');
const ctrl = require('../controllers/bookingController');
const { requireAuth } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { requirePermission, restrictPhoneEdit } = require('../middleware/permissionMiddleware');
const { requireUsageLimit } = require('../middleware/planMiddleware');
const { createBookingValidators, updateBookingValidators } = require('../validators/bookingValidators');

const router = express.Router();
router.use(requireAuth);

router.get('/', requirePermission('bookings', 'read'), ctrl.list);
router.get('/export/csv', requirePermission('bookings', 'read'), ctrl.exportCSV);
router.get('/:id', requirePermission('bookings', 'read'), ctrl.getOne);
router.post('/', requirePermission('bookings', 'create'), requireUsageLimit('bookings'), createBookingValidators, validate, ctrl.create);
router.put('/:id', requirePermission('bookings', 'update'), restrictPhoneEdit, updateBookingValidators, validate, ctrl.update);
router.delete('/:id', requirePermission('bookings', 'delete'), ctrl.remove);

router.get('/:id/follow-ups', requirePermission('bookings', 'read'), ctrl.listFollowUps);
router.post('/:id/follow-ups', requirePermission('bookings', 'update'), ctrl.createFollowUp);

module.exports = router;
