const crypto = require('crypto');

/** Generates a 6-digit numeric OTP and an ISO expiry timestamp (10 min). */
function generateOTP() {
  const otp = crypto.randomInt(100000, 999999).toString();
  const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  return { otp, expiry };
}

module.exports = { generateOTP };
