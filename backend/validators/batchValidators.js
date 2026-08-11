const { body } = require('express-validator');

const batchValidators = [
  body('name').notEmpty().withMessage('Batch name is required.'),
  body('tripName').notEmpty().withMessage('Trip name is required.'),
  body('departureDate').notEmpty().withMessage('Departure date is required.'),
  body('totalCapacity').isInt({ min: 0 }).withMessage('Total capacity must be a non-negative number.'),
];

module.exports = { batchValidators };
