const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/bookingController');
const { requireAuth } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { requirePermission, restrictPhoneEdit } = require('../middleware/permissionMiddleware');

const router = express.Router();
router.use(requireAuth);

const bookingValidators = [
  body('phone').matches(/^[0-9+\-\s()]{7,15}$/).withMessage('A valid phone number is required.'),
  body('customerName').custom((value, { req }) => {
    // Booking creation defaults travelStatus to 'Booked' downstream if it's
    // omitted, so validation has to assume the same default - otherwise
    // simply not sending travelStatus skipped every check below even though
    // the booking still ends up 'Booked'.
    const status = req.body.travelStatus || 'Booked';
    if (['Booked', 'Completed', 'Refunded'].includes(status) && !value) {
      throw new Error('Customer name is required when status is Booked, Completed, or Refunded.');
    }
    return true;
  }),
  body('email').custom((value, { req }) => {
    // Booking creation defaults travelStatus to 'Booked' downstream if it's
    // omitted, so validation has to assume the same default - otherwise
    // simply not sending travelStatus skipped every check below even though
    // the booking still ends up 'Booked'.
    const status = req.body.travelStatus || 'Booked';
    if (['Booked', 'Completed', 'Refunded'].includes(status)) {
      if (!value || !/^\S+@\S+\.\S+$/.test(value)) {
        throw new Error('A valid email is required when status is Booked, Completed, or Refunded.');
      }
    }
    return true;
  }),
  body('trip').custom((value, { req }) => {
    // Booking creation defaults travelStatus to 'Booked' downstream if it's
    // omitted, so validation has to assume the same default - otherwise
    // simply not sending travelStatus skipped every check below even though
    // the booking still ends up 'Booked'.
    const status = req.body.travelStatus || 'Booked';
    if (['Booked', 'Completed', 'Refunded'].includes(status) && !value) {
      throw new Error('Trip name is required when status is Booked, Completed, or Refunded.');
    }
    return true;
  }),
  body('departure').custom((value, { req }) => {
    // Booking creation defaults travelStatus to 'Booked' downstream if it's
    // omitted, so validation has to assume the same default - otherwise
    // simply not sending travelStatus skipped every check below even though
    // the booking still ends up 'Booked'.
    const status = req.body.travelStatus || 'Booked';
    if (['Booked', 'Completed', 'Refunded'].includes(status) && !value) {
      throw new Error('Departure date is required when status is Booked, Completed, or Refunded.');
    }
    return true;
  }),
  body('members').custom((value, { req }) => {
    // Booking creation defaults travelStatus to 'Booked' downstream if it's
    // omitted, so validation has to assume the same default - otherwise
    // simply not sending travelStatus skipped every check below even though
    // the booking still ends up 'Booked'.
    const status = req.body.travelStatus || 'Booked';
    if (['Booked', 'Completed', 'Refunded'].includes(status)) {
      const num = Number(value);
      if (isNaN(num) || num < 1) {
        throw new Error('Members must be at least 1 when status is Booked, Completed, or Refunded.');
      }
    }
    return true;
  }),
  body('pricePerPerson').custom((value, { req }) => {
    // Booking creation defaults travelStatus to 'Booked' downstream if it's
    // omitted, so validation has to assume the same default - otherwise
    // simply not sending travelStatus skipped every check below even though
    // the booking still ends up 'Booked'.
    const status = req.body.travelStatus || 'Booked';
    if (['Booked', 'Completed', 'Refunded'].includes(status)) {
      const num = Number(value);
      if (isNaN(num) || num < 0) {
        throw new Error('Price per person must be a positive number when status is Booked, Completed, or Refunded.');
      }
    }
    return true;
  }),
];

// Booking updates arrive as partial patches (edit a single field from the
// table), so these only validate fields that are actually present - unlike
// bookingValidators above, there's no travelStatus-based default to reason
// about since an update can't remove an already-required field.
const bookingUpdateValidators = [
  body('customerName').optional().notEmpty().withMessage('Customer name cannot be empty.'),
  body('phone').optional().matches(/^[0-9+\-\s()]{7,15}$/).withMessage('A valid phone number is required.'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('A valid email is required.'),
  body('members').optional().isInt({ min: 1 }).withMessage('Members must be at least 1.'),
  body('pricePerPerson').optional().isFloat({ min: 0 }).withMessage('Price per person must be a positive number.'),
];

router.get('/', ctrl.list);
router.get('/export/csv', ctrl.exportCSV);
router.get('/:id', ctrl.getOne);
router.post('/', requirePermission('canCreateLeads', true), bookingValidators, validate, ctrl.create);
router.put('/:id', requirePermission('canEditLeads', true), restrictPhoneEdit, bookingUpdateValidators, validate, ctrl.update);
router.delete('/:id', requirePermission('canDeleteLeads', false), ctrl.remove);

router.get('/:id/follow-ups', ctrl.listFollowUps);
router.post('/:id/follow-ups', ctrl.createFollowUp);

module.exports = router;
