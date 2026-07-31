const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/hotelController');
const { requireAuth } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(requireAuth);

const hotelValidators = [
  body('name').notEmpty().withMessage('Hotel name is required.'),
  body('city').notEmpty().withMessage('City name is required.'),
];

router.get('/', ctrl.listHotels);
router.get('/:id', ctrl.getHotelById);
router.post('/', hotelValidators, validate, ctrl.createHotel);
router.put('/:id', hotelValidators, validate, ctrl.updateHotel);
router.delete('/:id', ctrl.deleteHotel);

module.exports = router;
