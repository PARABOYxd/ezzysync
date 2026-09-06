const { validationResult } = require('express-validator');

/**
 * Turns validator output into something the person filling in the form can act
 * on.
 *
 * The per-field `errors` array is still there for forms that highlight
 * individual inputs, but `message` now names the actual problem. It used to be
 * the fixed string "Validation failed.", and since the frontend shows
 * `response.data.message`, an agent who mistyped an email was told only that
 * something was wrong - not what, and not where.
 */
function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));

  // Two or three read fine inline; beyond that a count is kinder than a wall
  // of text in a toast.
  const summary =
    errors.length <= 3
      ? errors.map((e) => e.message).join(' ')
      : `${errors
          .slice(0, 2)
          .map((e) => e.message)
          .join(' ')} (and ${errors.length - 2} more).`;

  res.status(400).json({ message: summary, errors });
}

module.exports = { validate };
