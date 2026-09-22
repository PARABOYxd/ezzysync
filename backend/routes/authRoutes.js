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

const env = require('../config/env');

const router = express.Router();

/**
 * Self sign-up is switched off unless ENABLE_SELF_SIGNUP=true. While it is
 * off, accounts are created by the EzzySync team and visitors can only send
 * an access request (POST /api/public/walkthrough).
 *
 * The routes stay mounted and answer, rather than disappearing, so an old
 * browser tab or a bookmarked Google link gets a clear message instead of a
 * 404. Checked per request, so flipping the flag needs only a restart.
 */
const SIGNUP_CLOSED = 'New accounts are created by our team. Please request access and we will set you up.';

function requireSelfSignup(req, res, next) {
  if (env.features.selfSignup) return next();
  return res.status(403).json({ message: SIGNUP_CLOSED, code: 'SIGNUP_DISABLED' });
}

// The Google routes are browser navigations, not API calls - a JSON body
// would be a dead end, so they go back to the login page with a reason.
function requireSelfSignupRedirect(req, res, next) {
  if (env.features.selfSignup) return next();
  return res.redirect(`${env.frontendUrl.replace(/\/$/, '')}/login?error=signup_disabled`);
}

router.post('/register', requireSelfSignup, registerLimiter, registerValidators, validate, ctrl.register);

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
router.post('/register/send-otp', requireSelfSignup, otpRequestLimiter, sendRegistrationOtpValidators, validate, ctrl.sendRegistrationOTP);

router.post('/register/verify-otp', requireSelfSignup, otpVerifyLimiter, verifyRegistrationOtpValidators, validate, ctrl.verifyRegistrationOTP);

// Google Sign-in routes
router.get('/google', requireSelfSignupRedirect, googleAuthCtrl.googleLoginRedirect);
router.get('/google/callback', requireSelfSignupRedirect, googleAuthCtrl.googleLoginCallback);

module.exports = router;
