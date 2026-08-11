const { body } = require('express-validator');

const hotelValidators = [
  body('name').notEmpty().withMessage('Hotel name is required.'),
  body('city').notEmpty().withMessage('City name is required.'),
];

module.exports = { hotelValidators };
