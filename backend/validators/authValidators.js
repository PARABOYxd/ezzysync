const { body } = require('express-validator');

// Every field is required to be a string before anything else is checked.
// An array passes isEmail() element by element, and a number or boolean
// reaches .toLowerCase() or bcrypt further down and throws - both were 500s
// the QA matrix found on every auth route.
const registerValidators = [
  body('email').isString().withMessage('A valid email is required.').bail().isEmail().withMessage('A valid email is required.'),
  body('password').isString().withMessage('Password must be at least 6 characters.').bail().isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  body('name').isString().withMessage('Name is required.').bail().notEmpty().withMessage('Name is required.'),
  body('companyName').isString().withMessage('Company name is required.').bail().notEmpty().withMessage('Company name is required.'),
  // Both required so email verification can't be skipped by calling this
  // route directly without ever completing the send-otp step.
  body('regToken').isString().withMessage('Email verification is required before registering.').bail().notEmpty().withMessage('Email verification is required before registering.'),
  body('otp').isString().withMessage('A valid 6-digit OTP is required.').bail().isLength({ min: 6, max: 6 }).withMessage('A valid 6-digit OTP is required.'),
];

const loginValidators = [
  body('email').isString().withMessage('A valid email is required.').bail().isEmail().withMessage('A valid email is required.'),
  body('password').isString().withMessage('Password is required.').bail().notEmpty().withMessage('Password is required.'),
];

const refreshValidators = [
  body('refreshToken').isString().withMessage('Refresh token is required.').bail().notEmpty().withMessage('Refresh token is required.'),
];

const forgotPasswordValidators = [
  body('email').isString().withMessage('A valid email is required.').bail().isEmail().withMessage('A valid email is required.'),
];

const resetPasswordValidators = [
  // Without withMessage this reported express-validator's default, "Invalid
  // value" - the one message on this page that named neither the field nor
  // the problem.
  body('email').isString().withMessage('A valid email is required.').bail().isEmail().withMessage('A valid email is required.'),
  body('otp').isString().withMessage('OTP must be 6 digits.').bail().isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits.'),
  body('newPassword').isString().withMessage('Password must be at least 6 characters.').bail().isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
];

const sendRegistrationOtpValidators = [
  body('email').isString().withMessage('A valid email is required.').bail().isEmail().withMessage('A valid email is required.'),
];

const verifyRegistrationOtpValidators = [
  body('email').isString().withMessage('A valid email is required.').bail().isEmail().withMessage('A valid email is required.'),
  body('regToken').isString().withMessage('Verification token is required.').bail().notEmpty().withMessage('Verification token is required.'),
  body('otp').isString().withMessage('A valid 6-digit OTP is required.').bail().isLength({ min: 6, max: 6 }).withMessage('A valid 6-digit OTP is required.'),
];

module.exports = {
  registerValidators,
  loginValidators,
  refreshValidators,
  forgotPasswordValidators,
  resetPasswordValidators,
  sendRegistrationOtpValidators,
  verifyRegistrationOtpValidators,
};
