const { body } = require('express-validator');

const leadValidators = [
  body('phone').matches(/^[0-9+\-\s()]{7,15}$/).withMessage('A valid phone number is required.'),
];

module.exports = { leadValidators };
