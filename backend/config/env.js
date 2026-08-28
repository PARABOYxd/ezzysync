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
    refreshTokenExpiresInDays: Number(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS || 30),
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

    whatsapp: {
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
      apiVersion: process.env.WHATSAPP_API_VERSION || 'v20.0',
      verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
    },

    facebook: {
      appId: process.env.FACEBOOK_APP_ID || '',
      appSecret: process.env.FACEBOOK_APP_SECRET || '',
    },
    backendUrl: (process.env.BACKEND_URL && process.env.BACKEND_URL.trim() !== '')
      ? process.env.BACKEND_URL
      : (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'https://ezzysync-production.up.railway.app'),

    rateLimit: {
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
      max: Number(process.env.RATE_LIMIT_MAX || 200),
    },
    tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
    unsplashAccessKey: process.env.UNSPLASH_ACCESS_KEY || '',
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockKeyId123',
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || 'mockSecretKey123',

    // Email: Resend (HTTPS API) is the default. SMTP is optional and only
    // attempted if SMTP_HOST is set - useful once off a Render free
    // instance, which blocks outbound SMTP ports.
    resendApiKey: process.env.RESEND_API_KEY || '',
    emailFrom: process.env.EMAIL_FROM || '',
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: process.env.SMTP_PORT || '587',
    smtpSecure: process.env.SMTP_SECURE || 'false',
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    
    // Cloudflare R2 configuration
    r2: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      endpoint: process.env.R2_ENDPOINT || '',
      bucketName: process.env.R2_BUCKET_NAME || '',
      publicUrl: process.env.R2_PUBLIC_URL || '',
    },
  };
}

module.exports = loadEnv();
