const { body } = require('express-validator');

// Passwords people reach for when told "needs a capital, a number and a
// symbol". They satisfy every rule below, so they are refused by name.
const COMMON_PASSWORDS = new Set([
  'password@123', 'password@1234', 'password#123', 'passw0rd@123',
  'admin@123', 'admin@1234', 'admin#123', 'welcome@123', 'welcome@1234',
  'qwerty@123', 'qwerty@1234', 'abcd@1234', 'abc@12345', 'india@123',
  'test@1234', 'user@1234', 'ezzysync@123', 'ezzysync@1234',
]);

/**
 * Strong-password rule for accounts a super admin creates on someone's
 * behalf. Lists every unmet requirement in one message, so the caller fixes
 * the password in one go instead of one rule per attempt.
 *
 * 72 is bcrypt's input limit: anything past it is silently ignored, so a
 * longer password would not be as strong as it looks.
 */
function assertStrongPassword(password, { req }) {
  const problems = [];
  if (password.length < 8) problems.push('at least 8 characters');
  if (Buffer.byteLength(password, 'utf8') > 72) problems.push('at most 72 characters');
  if (!/[a-z]/.test(password)) problems.push('a lowercase letter');
  if (!/[A-Z]/.test(password)) problems.push('an uppercase letter');
  if (!/[0-9]/.test(password)) problems.push('a number');
  if (!/[^A-Za-z0-9\s]/.test(password)) problems.push('a special character (e.g. @ # $ !)');
  if (/\s/.test(password)) problems.push('no spaces');
  if (problems.length) {
    throw new Error(`Password needs ${problems.join(', ')}.`);
  }

  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) {
    throw new Error('This password is too common. Choose something less guessable.');
  }
  const localPart = String(req.body.email || '').split('@')[0].toLowerCase();
  if (localPart.length >= 4 && lower.includes(localPart)) {
    throw new Error('Password must not contain the email address.');
  }
  return true;
}

// Same fields as self-signup (authValidators.registerValidators), minus the
// OTP/regToken pair: a super admin is vouching for the account instead of the
// owner proving they control the inbox.
const createTenantValidators = [
  body('email')
    .isString().withMessage('A valid email is required.').bail()
    .trim().toLowerCase()
    .isEmail().withMessage('A valid email is required.').bail()
    .isLength({ max: 254 }).withMessage('Email is too long.'),
  body('password')
    .isString().withMessage('Password is required.').bail()
    .custom(assertStrongPassword),
  body('name')
    .isString().withMessage('Name is required.').bail()
    .trim().notEmpty().withMessage('Name is required.').bail()
    .isLength({ max: 100 }).withMessage('Name must be at most 100 characters.'),
  body('companyName')
    .isString().withMessage('Company name is required.').bail()
    .trim().notEmpty().withMessage('Company name is required.').bail()
    .isLength({ max: 150 }).withMessage('Company name must be at most 150 characters.'),
];

module.exports = { createTenantValidators, assertStrongPassword };
