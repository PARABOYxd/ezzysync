const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/quotationController');
const { requireAuth } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { publicLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

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

// Public routes for clients (No login required)
router.get('/public/:uuid', publicLimiter, ctrl.getPublic);
router.post('/:id/accept-public', publicLimiter, ctrl.accept);

// Authenticated CRM team routes
router.use(requireAuth);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', quotationValidators, validate, ctrl.create);
router.put('/:id', quotationValidators, validate, ctrl.update);
router.delete('/:id', ctrl.deleteQuote);
router.post('/:id/accept', ctrl.accept);
router.post('/:id/duplicate', ctrl.duplicate);

module.exports = router;
