const express = require('express');
const ctrl = require('../controllers/authController');
const googleAuthCtrl = require('../controllers/googleAuthController');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/authMiddleware');
const { loginLimiter, otpRequestLimiter, otpVerifyLimiter, registerLimiter, refreshLimiter } = require('../middleware/rateLimiter');
const {
  registerValidators,
  loginValidators,
  refreshValidators,
  forgotPasswordValidators,
  resetPasswordValidators,
  sendRegistrationOtpValidators,
  verifyRegistrationOtpValidators,
} = require('../validators/authValidators');

const router = express.Router();

router.post('/register', registerLimiter, registerValidators, validate, ctrl.register);

router.post('/login', loginLimiter, loginValidators, validate, ctrl.login);

router.get('/me', requireAuth, ctrl.me);

router.post('/refresh', refreshLimiter, refreshValidators, validate, ctrl.refresh);

// No requireAuth: a client calling logout with an already-expired access
// token should still be able to revoke its refresh token. refreshToken is
// optional so the frontend can call this defensively even if it somehow
// has no refresh token stored (it just becomes a no-op).
router.post('/logout', ctrl.logout);

router.post('/forgot-password', otpRequestLimiter, forgotPasswordValidators, validate, ctrl.forgotPassword);

router.post('/reset-password', otpVerifyLimiter, resetPasswordValidators, validate, ctrl.resetPassword);

// Registration OTP: verify organization email before creating account
router.post('/register/send-otp', otpRequestLimiter, sendRegistrationOtpValidators, validate, ctrl.sendRegistrationOTP);

router.post('/register/verify-otp', otpVerifyLimiter, verifyRegistrationOtpValidators, validate, ctrl.verifyRegistrationOTP);

// Google Sign-in routes
router.get('/google', googleAuthCtrl.googleLoginRedirect);
router.get('/google/callback', googleAuthCtrl.googleLoginCallback);

module.exports = router;
