const { body } = require('express-validator');

const registerValidators = [
  body('email').isEmail().withMessage('A valid email is required.'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  body('name').notEmpty().withMessage('Name is required.'),
  body('companyName').notEmpty().withMessage('Company name is required.'),
  // Both required so email verification can't be skipped by calling this
  // route directly without ever completing the send-otp step.
  body('regToken').notEmpty().withMessage('Email verification is required before registering.'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('A valid 6-digit OTP is required.'),
];

const loginValidators = [
  body('email').isEmail().withMessage('A valid email is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
];

const refreshValidators = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required.'),
];

const forgotPasswordValidators = [
  body('email').isEmail().withMessage('A valid email is required.'),
];

const resetPasswordValidators = [
  body('email').isEmail(),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits.'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
];

const sendRegistrationOtpValidators = [
  body('email').isEmail().withMessage('A valid email is required.'),
];

const verifyRegistrationOtpValidators = [
  body('email').isEmail().withMessage('A valid email is required.'),
  body('regToken').notEmpty().withMessage('Verification token is required.'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('A valid 6-digit OTP is required.'),
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
