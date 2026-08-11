const express = require('express');
const ctrl = require('../controllers/hotelController');
const { hotelValidators } = require('../validators/hotelValidators');
const { requireAuth } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { requirePermission } = require('../middleware/permissionMiddleware');

const router = express.Router();
router.use(requireAuth);

router.get('/', requirePermission('hotels', 'read'), ctrl.listHotels);
router.get('/:id', requirePermission('hotels', 'read'), ctrl.getHotelById);
router.post('/', requirePermission('hotels', 'create'), hotelValidators, validate, ctrl.createHotel);
router.put('/:id', requirePermission('hotels', 'update'), hotelValidators, validate, ctrl.updateHotel);
router.delete('/:id', requirePermission('hotels', 'delete'), ctrl.deleteHotel);

module.exports = router;
