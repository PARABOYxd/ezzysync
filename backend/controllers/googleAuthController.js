const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userService = require('../services/userService');

// We create a custom OAuth2 client specifically for login using the loginRedirectUri
function getLoginOAuth2Client() {
  return new google.auth.OAuth2(
    env.google.clientId,
    env.google.clientSecret,
    env.google.loginRedirectUri
  );
}

const SCOPES = [
  'openid',
  'email',
  'profile',
];

function signToken(user) {
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

exports.googleLoginRedirect = (req, res) => {
  const client = getLoginOAuth2Client();
  const url = client.generateAuthUrl({
    access_type: 'online',
    scope: SCOPES,
    prompt: 'select_account',
  });
  res.redirect(url);
};

exports.googleLoginCallback = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.redirect(`${env.frontendUrl}/login?error=Google authentication failed.`);
    }

    const client = getLoginOAuth2Client();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      version: 'v2',
      auth: client,
    });

    const { data: profile } = await oauth2.userinfo.get();
    const googleId = profile.id;
    const email = profile.email;
    const name = profile.name || email.split('@')[0];

    if (!googleId || !email) {
      throw new Error('Google did not return essential profile information.');
    }

    // Find or create user
    const user = await userService.findOrCreateGoogleUser({
      email,
      name,
      googleId,
    });

    // Sign JWT
    const token = signToken(user);

    // Redirect to frontend callback route with token
    res.redirect(`${env.frontendUrl}/auth/google/callback?token=${token}`);
  } catch (err) {
    req.log.error({ err }, 'Google login callback failed');
    res.redirect(`${env.frontendUrl}/login?error=${encodeURIComponent(err.message || 'Google login failed')}`);
  }
};
