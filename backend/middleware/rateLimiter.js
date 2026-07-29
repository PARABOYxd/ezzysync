const rateLimit = require('express-rate-limit');
const env = require('../config/env');

/** IP alone lets a botnet spread guesses across many source addresses;
 * IP+email keys the bucket per targeted account too, so distributing
 * requests across IPs no longer resets the counter for that account. */
function ipAndEmailKey(req) {
  const email = (req.body?.email || '').trim().toLowerCase();
  return email ? `${req.ip}:${email}` : req.ip;
}

const apiLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please slow down and try again shortly.' },
});

// Password guessing on /auth/login. Keyed by IP+email: caps attempts against
// one account regardless of how many IPs an attacker spreads the guesses across.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipAndEmailKey,
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
});

// OTP delivery (registration + forgot-password send/resend). Tight limit
// stops the endpoint being used to spam a victim's inbox/phone.
const otpRequestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipAndEmailKey,
  message: { message: 'Too many code requests. Please wait a few minutes before requesting another code.' },
});

// OTP verification (reset-password). A 6-digit OTP has ~900k combinations and
// expires in 10 minutes (see otpService.generateOTP); 8 tries/15min keyed by
// IP+email makes exhausting that space within the OTP's lifetime infeasible.
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipAndEmailKey,
  message: { message: 'Too many attempts. Please request a new code and try again.' },
});

// Registration itself (account creation abuse / scripted signups).
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many registration attempts from this network. Please try again later.' },
});

// Unauthenticated public links (quotation share links, marketing form).
// Looser than the auth limiters since legitimate customers may reload
// their own quote link repeatedly, but still bounds scraping/abuse.
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please slow down and try again shortly.' },
});

module.exports = {
  apiLimiter,
  loginLimiter,
  otpRequestLimiter,
  otpVerifyLimiter,
  registerLimiter,
  publicLimiter, 
};