const env = require('../config/env');
const gmailApiService = require('../services/gmailApiService');
const userService = require('../services/userService');
const tokenService = require('../services/tokenService');

exports.googleLoginRedirect = (req, res) => {
  const host = req.get('host');
  const protocol = req.protocol;
  const redirectUri = `${protocol}://${host}/api/auth/google/callback`;
  res.redirect(gmailApiService.buildLoginAuthUrl(redirectUri));
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
    const { googleId, email, name } = await gmailApiService.exchangeLoginAuthCode(code, redirectUri);

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
    // The raw message went into the login page's URL bar, where a person sees
    // things like "connect ETIMEDOUT" or a Google API trace. Full detail is in
    // the log line above; the screen gets something actionable.
    res.redirect(
      `${env.frontendUrl}/login?error=${encodeURIComponent(
        'Could not sign in with Google. Please try again, or use your email and password.'
      )}`
    );
  }
};
