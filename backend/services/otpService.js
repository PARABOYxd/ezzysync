const crypto = require('crypto');

/** Generates a 6-digit numeric OTP and an ISO expiry timestamp (10 min). */
function generateOTP() {
  const otp = crypto.randomInt(100000, 999999).toString();
  const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  return { otp, expiry };
}

/**
 * The code, bound to the address it was sent to, keyed with a server secret.
 *
 * The registration token used to carry the OTP itself. A JWT payload is only
 * base64, so the browser that asked for a code could read it straight out of
 * the response without ever opening the email - the "verification" proved
 * nothing about owning the address. The token now carries this digest
 * instead: without OTP_SECRET it cannot be reversed or checked offline, so
 * the only way to learn the code is the inbox, and guessing it has to go
 * through the rate-limited verify/register endpoints.
 */
function registrationOtpDigest(email, otp) {
  const env = require('../config/env');
  return crypto
    .createHmac('sha256', env.otpSecret)
    .update(`${String(email).toLowerCase()}:${otp}`)
    .digest('hex');
}

function registrationOtpMatches(email, otp, digest) {
  if (typeof digest !== 'string' || digest.length !== 64) return false;
  const expected = Buffer.from(registrationOtpDigest(email, otp), 'hex');
  const given = Buffer.from(digest, 'hex');
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

module.exports = { generateOTP, registrationOtpDigest, registrationOtpMatches };
