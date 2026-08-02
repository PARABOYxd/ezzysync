const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/authController');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/authMiddleware');
const { loginLimiter, otpRequestLimiter, otpVerifyLimiter, registerLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post(
  '/register',
  registerLimiter,
  [
    body('email').isEmail().withMessage('A valid email is required.'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
    body('name').notEmpty().withMessage('Name is required.'),
    body('companyName').notEmpty().withMessage('Company name is required.'),
    // Both required so email verification can't be skipped by calling this
    // route directly without ever completing the send-otp step.
    body('regToken').notEmpty().withMessage('Email verification is required before registering.'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('A valid 6-digit OTP is required.'),
  ],
  validate,
  ctrl.register
);

router.post(
  '/login',
  loginLimiter,
  [
    body('email').isEmail().withMessage('A valid email is required.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  validate,
  ctrl.login
);

router.get('/me', requireAuth, ctrl.me);

router.post(
  '/forgot-password',
  otpRequestLimiter,
  [body('email').isEmail().withMessage('A valid email is required.')],
  validate,
  ctrl.forgotPassword
);

router.post(
  '/reset-password',
  otpVerifyLimiter,
  [
    body('email').isEmail(),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits.'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  ],
  validate,
  ctrl.resetPassword
);

// Registration OTP: verify organization email before creating account
router.post(
  '/register/send-otp',
  otpRequestLimiter,
  [body('email').isEmail().withMessage('A valid email is required.')],
  validate,
  ctrl.sendRegistrationOTP
);

router.post(
  '/register/verify-otp',
  otpVerifyLimiter,
  [
    body('email').isEmail().withMessage('A valid email is required.'),
    body('regToken').notEmpty().withMessage('Verification token is required.'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('A valid 6-digit OTP is required.'),
  ],
  validate,
  ctrl.verifyRegistrationOTP
);

// Google Sign-in routes
const googleAuthCtrl = require('../controllers/googleAuthController');
router.get('/google', googleAuthCtrl.googleLoginRedirect);
router.get('/google/callback', googleAuthCtrl.googleLoginCallback);

module.exports = router;
