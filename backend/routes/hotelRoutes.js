const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/hotelController');
const { requireAuth } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { requirePermission } = require('../middleware/permissionMiddleware');

const router = express.Router();
router.use(requireAuth);

const hotelValidators = [
  body('name').notEmpty().withMessage('Hotel name is required.'),
  body('city').notEmpty().withMessage('City name is required.'),
];

router.get('/', requirePermission('hotels', 'read'), ctrl.listHotels);
router.get('/:id', requirePermission('hotels', 'read'), ctrl.getHotelById);
router.post('/', requirePermission('hotels', 'create'), hotelValidators, validate, ctrl.createHotel);
router.put('/:id', requirePermission('hotels', 'update'), hotelValidators, validate, ctrl.updateHotel);
router.delete('/:id', requirePermission('hotels', 'delete'), ctrl.deleteHotel);

module.exports = router;
