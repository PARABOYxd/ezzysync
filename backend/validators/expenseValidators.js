const { body } = require('express-validator');

/**
 * The repository casts with Number(amount || 0), so "abc" was stored as 0 and
 * answered 201, and "999999999999999999999999" overflowed the column as a 500.
 * A money field gets checked here, where the message can name it.
 */
const MAX_AMOUNT = 1e12;

const amountField = (field, label, { required }) => {
  const chain = required ? body(field) : body(field).optional({ values: 'falsy' });
  return chain
    .isFloat({ min: 0, max: MAX_AMOUNT })
    .withMessage(`${label} must be a number between 0 and ${MAX_AMOUNT.toLocaleString('en-IN')}.`);
};

// PUT replaces the whole expense (see expenseRepository.updateExpense), so
// create and update require the same fields.
const expenseValidators = [
  body('title').isString().withMessage('Title is required.').bail().trim().notEmpty().withMessage('Title is required.'),
  amountField('amount', 'Amount', { required: true }),
];

const expenseTemplateValidators = [
  body('trip_name').isString().withMessage('Trip name is required.').bail().trim().notEmpty().withMessage('Trip name is required.'),
  body('template_name').optional({ values: 'falsy' }).isString().withMessage('Template name must be text.'),
  amountField('hotel_cost_per_pax', 'Hotel cost', { required: false }),
  amountField('flight_cost_per_pax', 'Flight cost', { required: false }),
  amountField('transport_cost_per_pax', 'Transport cost', { required: false }),
  amountField('other_cost_per_pax', 'Other cost', { required: false }),
];

module.exports = { expenseValidators, expenseTemplateValidators };
