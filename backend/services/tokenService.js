const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const refreshTokenRepository = require('../repositories/refreshTokenRepository');

function signAccessToken(user) {
  return jwt.sign(
    {
      userId: user.userId,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions,
      companyName: user.companyName,
      planId: user.planId || 'FREE',
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Raw token is only ever returned to the caller, never persisted - the DB
// only ever sees its hash (see refresh_tokens table comment in db.js).
async function issueRefreshToken(user) {
  const raw = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + env.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000);
  await refreshTokenRepository.insertRefreshToken(user.userId, user.tenantId, hashRefreshToken(raw), expiresAt);
  return raw;
}

async function issueTokenPair(user) {
  const token = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user);
  return { token, refreshToken };
}

module.exports = { signAccessToken, issueRefreshToken, issueTokenPair, hashRefreshToken };
