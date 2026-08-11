const { body } = require('express-validator');

const PHONE_PATTERN = /^[0-9+\-\s()]{7,15}$/;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const STATUSES_REQUIRING_FULL_DETAILS = ['Booked', 'Completed'];

/**
 * Booking creation defaults travelStatus to 'Booked' downstream if it's
 * omitted, so create-time validation has to assume the same default -
 * otherwise simply not sending travelStatus skipped every conditional check
 * below even though the booking still ends up 'Booked'. Updates arrive as
 * partial patches and have no such default to reason about, since an update
 * can't remove an already-required field.
 */
function requiresFullDetails(req, { withDefault }) {
  const status = withDefault ? (req.body.travelStatus || 'Booked') : req.body.travelStatus;
  return STATUSES_REQUIRING_FULL_DETAILS.includes(status);
}

function requiredWhenBooked(field, message, { withDefault }) {
  return body(field).custom((value, { req }) => {
    if (requiresFullDetails(req, { withDefault }) && !value) {
      throw new Error(message);
    }
    return true;
  });
}

function emailWhenBooked({ withDefault }) {
  return body('email').custom((value, { req }) => {
    if (requiresFullDetails(req, { withDefault })) {
      if (!value || !EMAIL_PATTERN.test(value)) {
        throw new Error('A valid email is required when status is Booked or Completed.');
      }
    }
    return true;
  });
}

function numericWhenBooked(field, min, message, { withDefault }) {
  return body(field).custom((value, { req }) => {
    if (requiresFullDetails(req, { withDefault })) {
      const num = Number(value);
      if (isNaN(num) || num < min) {
        throw new Error(message);
      }
    }
    return true;
  });
}

const createBookingValidators = [
  body('phone').matches(PHONE_PATTERN).withMessage('A valid phone number is required.'),
  requiredWhenBooked('customerName', 'Customer name is required when status is Booked or Completed.', { withDefault: true }),
  emailWhenBooked({ withDefault: true }),
  requiredWhenBooked('trip', 'Trip name is required when status is Booked or Completed.', { withDefault: true }),
  requiredWhenBooked('departure', 'Departure date is required when status is Booked or Completed.', { withDefault: true }),
  numericWhenBooked('members', 1, 'Members must be at least 1 when status is Booked or Completed.', { withDefault: true }),
  numericWhenBooked('pricePerPerson', 0, 'Price per person must be a positive number when status is Booked or Completed.', { withDefault: true }),
];

const updateBookingValidators = [
  requiredWhenBooked('customerName', 'Customer name is required when status is Booked or Completed.', { withDefault: false }),
  body('phone').optional().matches(PHONE_PATTERN).withMessage('A valid phone number is required.'),
  emailWhenBooked({ withDefault: false }),
  numericWhenBooked('members', 1, 'Members must be at least 1 when status is Booked or Completed.', { withDefault: false }),
  numericWhenBooked('pricePerPerson', 0, 'Price per person must be a positive number when status is Booked or Completed.', { withDefault: false }),
];

module.exports = { createBookingValidators, updateBookingValidators };
