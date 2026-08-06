const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userService = require('../services/userService');
const otpService = require('../services/otpService');
const emailService = require('../services/emailService');
const tokenService = require('../services/tokenService');
const refreshTokenRepository = require('../repositories/refreshTokenRepository');

function publicUser(user) {
  return {
    userId: user.userId,
    tenantId: user.tenantId,
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: user.permissions,
    companyName: user.companyName,
    planId: user.planId || 'FREE',
  };
}

// Verifies a registration regToken/OTP pair. Returns the decoded token
// payload on success, or a { status, message } error object on failure -
// shared by the standalone verify-otp step and the final register step so
// both apply the exact same rules.
function checkRegistrationOTP(regToken, email, otp) {
  try {
    const decoded = jwt.verify(regToken, env.jwtSecret);
    if (decoded.email.toLowerCase() !== email.toLowerCase()) {
      return { error: { status: 400, message: 'Email mismatch with verification token.' } };
    }
    if (decoded.otp !== otp) {
      return { error: { status: 400, message: 'Invalid OTP. Please check the code sent to your email.' } };
    }
    if (new Date(decoded.expiry) < new Date()) {
      return { error: { status: 400, message: 'OTP has expired. Please request a new code.' } };
    }
    return { decoded };
  } catch (jwtErr) {
    return { error: { status: 400, message: 'Verification token expired or invalid. Please restart registration.' } };
  }
}

async function register(req, res, next) {
  try {
    const { email, password, name, companyName, otp, regToken } = req.body;

    // If regToken provided, verify OTP from token before creating account
    if (regToken) {
      const { error } = checkRegistrationOTP(regToken, email, otp);
      if (error) return res.status(error.status).json({ message: error.message });
    }

    const user = await userService.createUser({ email, password, name, companyName });
    const { token, refreshToken } = await tokenService.issueTokenPair(user);
    res.status(201).json({ token, refreshToken, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

// Standalone check so the frontend can validate the OTP right on the
// "verify code" step, instead of the user only finding out it was wrong
// after filling in the rest of the form on the final step.
async function verifyRegistrationOTP(req, res) {
  const { email, otp, regToken } = req.body;
  const { error } = checkRegistrationOTP(regToken, email, otp);
  if (error) return res.status(error.status).json({ message: error.message });
  res.json({ message: 'Email verified.' });
}

async function sendRegistrationOTP(req, res, next) {
  try {
    const { email } = req.body;
    // Check if email already registered
    const existing = await userService.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    const { otp, expiry } = otpService.generateOTP();
    // Encode email + otp + expiry in a short-lived JWT (regToken)
    const regToken = jwt.sign(
      { email: email.toLowerCase(), otp, expiry },
      env.jwtSecret,
      { expiresIn: '15m' }
    );
    // Send OTP via email (falls back to console log in dev). Catch here so a
    // third-party provider error (e.g. Resend rejecting an address) doesn't
    // leak its raw message to the client via the generic error handler.
    try {
      await emailService.sendRegistrationOTPEmail({ to: email, otp });
    } catch (emailErr) {
      req.log?.error({ err: emailErr, email }, 'Failed to send registration OTP email');
      return res.status(502).json({ message: 'Could not send the verification email right now. Please try again in a moment.' });
    }
    res.json({ regToken, message: 'OTP sent to your email. Valid for 15 minutes.' });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await userService.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const valid = await userService.verifyPassword(user, password);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const { token, refreshToken } = await tokenService.issueTokenPair(user);
    res.json({ token, refreshToken, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  res.json({ user: req.user });
}

// Silent re-auth: trades a still-valid refresh token for a new access token
// without asking the user to log in again. Rotates the refresh token too
// (old one revoked, new one issued) so a replayed/leaked token is only
// good for one refresh before it stops working.
async function refresh(req, res) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required.' });
    }

    const tokenHash = tokenService.hashRefreshToken(refreshToken);
    const stored = await refreshTokenRepository.findValidRefreshToken(tokenHash);
    if (!stored) {
      return res.status(401).json({ message: 'Invalid or expired session. Please log in again.' });
    }

    const user = await userService.findUserById(stored.user_id);
    if (!user) {
      return res.status(401).json({ message: 'Invalid or expired session. Please log in again.' });
    }

    await refreshTokenRepository.revokeRefreshToken(tokenHash);
    const pair = await tokenService.issueTokenPair(user);
    res.json(pair);
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired session. Please log in again.' });
  }
}

async function logout(req, res) {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await refreshTokenRepository.revokeRefreshToken(tokenService.hashRefreshToken(refreshToken));
  }
  res.json({ message: 'Logged out.' });
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = await userService.findUserByEmail(email);
    // Always respond success to avoid leaking which emails are registered
    if (!user) {
      return res.json({ message: 'If that email exists, an OTP has been sent.' });
    }
    const { otp, expiry } = otpService.generateOTP();
    await userService.setResetOTP(email, otp, expiry);
    try {
      await emailService.sendOTPEmail({
        tenantId: user.tenantId,
        to: email,
        otp,
      });
    } catch (emailErr) {
      // Log but still return the same generic message below - letting this
      // fail differently would tell an attacker the email exists AND that
      // sending broke, on top of leaking the raw provider error.
      req.log?.error({ err: emailErr, email }, 'Failed to send password reset OTP email');
    }
    res.json({ message: 'If that email exists, an OTP has been sent.' });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { email, otp, newPassword } = req.body;
    await userService.resetPasswordWithOTP(email, otp, newPassword);
    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me, forgotPassword, resetPassword, sendRegistrationOTP, verifyRegistrationOTP, refresh, logout };
