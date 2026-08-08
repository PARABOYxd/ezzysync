const { google } = require('googleapis');
const env = require('../config/env');
const userService = require('../services/userService');
const tokenService = require('../services/tokenService');

// We create a custom OAuth2 client specifically for login using the loginRedirectUri
function getLoginOAuth2Client(redirectUri) {
  return new google.auth.OAuth2(
    env.google.clientId,
    env.google.clientSecret,
    redirectUri || env.google.loginRedirectUri
  );
}

const SCOPES = [
  'openid',
  'email',
  'profile',
];

exports.googleLoginRedirect = (req, res) => {
  const host = req.get('host');
  const protocol = req.protocol;
  const redirectUri = `${protocol}://${host}/api/auth/google/callback`;
  const client = getLoginOAuth2Client(redirectUri);
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

    const host = req.get('host');
    const protocol = req.protocol;
    const redirectUri = `${protocol}://${host}/api/auth/google/callback`;
    const client = getLoginOAuth2Client(redirectUri);
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

    // Sign JWT + issue a refresh token, same as the regular email/password login
    const { token, refreshToken } = await tokenService.issueTokenPair(user);

    // Redirect to frontend callback route with both tokens
    res.redirect(`${env.frontendUrl}/auth/google/callback?token=${token}&refreshToken=${refreshToken}`);
  } catch (err) {
    req.log.error({ err }, 'Google login callback failed');
    res.redirect(`${env.frontendUrl}/login?error=${encodeURIComponent(err.message || 'Google login failed')}`);
  }
};
