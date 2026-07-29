require('dotenv').config();

/**
 * Central place to read & validate environment variables.
 * Fail fast on boot if something critical is missing, instead of
 * failing mysteriously deep inside a request handler later.
 */
const required = ['JWT_SECRET', 'DATABASE_URL'];

function loadEnv() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length && process.env.NODE_ENV !== 'test') {
    // eslint-disable-next-line no-console
    console.warn(
      `[config] Warning: missing env vars: ${missing.join(', ')}. ` +
        `Copy .env.example to .env and fill these in before using those features.`
    );
  }

  return {
    port: process.env.PORT || 5001,
    nodeEnv: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    otpSecret: process.env.OTP_SECRET || process.env.JWT_SECRET,

    db: {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
      loginRedirectUri: process.env.GOOGLE_LOGIN_REDIRECT_URI || `${process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/:[0-9]+$/, '') : 'http://localhost'}:5001/api/auth/google/callback`
    },

    smtp: {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      fromName: process.env.EMAIL_FROM_NAME || 'EzzySync',
    },

    whatsapp: {
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
      apiVersion: process.env.WHATSAPP_API_VERSION || 'v20.0',
    },

    rateLimit: {
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
      max: Number(process.env.RATE_LIMIT_MAX || 200),
    },
    tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockKeyId123',
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || 'mockSecretKey123',

    // Flat SMTP fields for emailService nodemailer fallback
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: process.env.SMTP_PORT || '587',
    smtpSecure: process.env.SMTP_SECURE || 'false',
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    smtpFrom: process.env.SMTP_FROM || '',
  };
}

module.exports = loadEnv();
