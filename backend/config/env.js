const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config(); // also check process cwd

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
    superAdminEmails: (process.env.SUPER_ADMIN_EMAILS || 'admin@gmail.com,jainpayal0201@gmail.com,admin@ezzysync.com')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),

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
      // How long an inbound message can sit before an automated reply to it
      // is considered stale (a backlog message from before a restart, say)
      // rather than something worth answering live.
      aiReplyMaxAgeSeconds: Number(process.env.AI_REPLY_MAX_AGE_SECONDS) || 15 * 60,
      maxMessagesPerMinute: Number(process.env.WHATSAPP_MAX_MESSAGES_PER_MINUTE) || 15,
      burstSize: Number(process.env.WHATSAPP_BURST_SIZE) || 10,
      // Spacing between resuming each tenant's QR session on boot, so a
      // restart doesn't try to reconnect every tenant's socket at once.
      resumeStaggerMs: Number(process.env.WHATSAPP_RESUME_STAGGER_MS) || 3000,
    },

    facebook: {
      appId: process.env.FACEBOOK_APP_ID || '',
      appSecret: process.env.FACEBOOK_APP_SECRET || '',
    },
    // Whether BACKEND_URL was actually set, as opposed to backendUrl below
    // having fallen back to a default - some call sites need to tell those
    // two cases apart (e.g. "are we definitely reachable at a real public
    // URL, or just guessing"), which the computed backendUrl can't answer
    // since it is never itself empty.
    backendUrlWasSet: Boolean(process.env.BACKEND_URL && process.env.BACKEND_URL.trim() !== ''),
    backendUrl: (process.env.BACKEND_URL && process.env.BACKEND_URL.trim() !== '')
      ? process.env.BACKEND_URL
      : (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'https://ezzysync-production.up.railway.app'),

    defaultTrialDays: Number(process.env.DEFAULT_TRIAL_DAYS || 30),
    logLevel: process.env.LOG_LEVEL || '',

    gemini: {
      model: process.env.GEMINI_MODEL || 'gemini-flash-latest',
      timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS) || 30000,
    },
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',

    instagram: {
      webhookVerifyToken: process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || 'ezzysync_ig_webhook_2024',
      pollIntervalMs: Number(process.env.IG_POLL_INTERVAL_MS) || 60000,
      firstPollDelayMs: Number(process.env.IG_FIRST_POLL_DELAY_MS) || 45000,
    },

    rateLimit: {
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
      max: Number(process.env.RATE_LIMIT_MAX || 200),
    },
    tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY,
    features: {
      // Off by default: accounts are created by the EzzySync team and a
      // visitor can only request access. Turning it on restores email
      // registration and "Continue with Google" together.
      selfSignup: process.env.ENABLE_SELF_SIGNUP === 'true',
      instagram: process.env.ENABLE_INSTAGRAM === 'true',
      whatsappWeb: process.env.ENABLE_WHATSAPP_WEB !== 'false',
      aiAutopilot: process.env.ENABLE_AI_AUTOPILOT !== 'false',
    },
    geminiApiKey: process.env.GEMINI_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    tavilyApiKey: process.env.TAVILY_API_KEY || '',
    weatherApiKey: process.env.WEATHER_API_KEY || '',
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
    unsplashAccessKey: process.env.UNSPLASH_ACCESS_KEY || '',
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockKeyId123',
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || 'mockSecretKey123',
    // Webhooks are signed with a separate secret set in the Razorpay
    // dashboard; falls back to the API key secret for tenants who haven't
    // configured a dedicated webhook secret yet.
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || 'mockSecretKey123',

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
      endpoint: process.env.R2_ENDPOINT || (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : ''),
      bucketName: process.env.R2_BUCKET_NAME || process.env.R2_BUCKET || '',
      // Customer documents (passports, tickets, vouchers). Should have public
      // access off; falls back to the main bucket when unset.
      privateBucketName: process.env.R2_PRIVATE_BUCKET_NAME || '',
      publicUrl: process.env.R2_PUBLIC_URL || process.env.R2_PUBLIC_BASE_URL || '',
    },
  };
}

module.exports = loadEnv();
