const { body } = require('express-validator');

// customerName intentionally has no format check here - quotations are
// built as Drafts before all client details are known, and the repository
// already falls back to 'TBD'. trip_name has no such fallback (NOT NULL in
// the DB), so it's the one field that must be required at this layer.
const quotationValidators = [
  body('tripName').notEmpty().withMessage('Trip / package name is required.'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('A valid email is required.'),
  body('phone').optional({ checkFalsy: true }).matches(/^[0-9+\-\s()]{7,15}$/).withMessage('A valid phone number is required.'),
  body('priceQuote').optional().isFloat({ min: 0 }).withMessage('Price quote must be a positive number.'),
];

module.exports = { quotationValidators };
