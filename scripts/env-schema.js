/**
 * One description of every environment variable the app reads.
 *
 * This is the single source that .env.example, the boot-time check and CI all
 * work from. Keeping three hand-maintained lists in step is how .env.example
 * ended up missing a dozen variables that .env actually needed - a new machine
 * would start, warn about nothing, and then fail somewhere deep in a request.
 *
 * level:
 *   'required'    - the app cannot run without it, in any environment.
 *   'production'  - a placeholder is fine locally, but shipping without it is
 *                   a real problem (money, security, or data loss).
 *   'optional'    - a feature is simply off without it.
 */
const BACKEND_ENV = [
  // --- core ---
  { key: 'DATABASE_URL', level: 'required', example: 'postgresql://postgres:password@localhost:5432/ezzysync', note: 'Postgres connection string' },
  { key: 'JWT_SECRET', level: 'required', example: 'change-me-to-a-long-random-string', note: 'Signs access tokens. Must be long and random in production.', minLength: 32 },
  { key: 'PORT', level: 'optional', example: '5001' },
  { key: 'NODE_ENV', level: 'optional', example: 'development' },
  { key: 'FRONTEND_URL', level: 'production', example: 'http://localhost:5173', note: 'Used for CORS and links inside emails/PDFs' },
  { key: 'BACKEND_URL', level: 'optional', example: 'http://localhost:5001' },

  // --- auth ---
  { key: 'JWT_EXPIRES_IN', level: 'optional', example: '7d' },
  { key: 'REFRESH_TOKEN_EXPIRES_IN_DAYS', level: 'optional', example: '30' },
  { key: 'OTP_SECRET', level: 'optional', example: '', note: 'Falls back to JWT_SECRET' },
  { key: 'TOKEN_ENCRYPTION_KEY', level: 'production', example: '', note: 'AES key for stored Google/Instagram credentials. Without it those cannot be decrypted.', minLength: 32 },

  // --- storage ---
  { key: 'R2_BUCKET_NAME', level: 'production', example: '', note: 'Cloudflare R2. Without all five R2 vars, uploads fall back to local disk - which is wiped on every deploy.' },
  { key: 'R2_ACCOUNT_ID', level: 'production', example: '' },
  { key: 'R2_ACCESS_KEY_ID', level: 'production', example: '' },
  { key: 'R2_SECRET_ACCESS_KEY', level: 'production', example: '' },
  { key: 'R2_ENDPOINT', level: 'production', example: '' },
  { key: 'R2_PUBLIC_URL', level: 'production', example: '' },

  // --- integrations ---
  { key: 'GEMINI_API_KEY', level: 'optional', example: '', note: 'AI replies and itinerary generation are off without it' },
  { key: 'GEMINI_MODEL', level: 'optional', example: 'gemini-3.5-flash' },
  { key: 'GOOGLE_CLIENT_ID', level: 'optional', example: '', note: 'Google sign-in and Gmail' },
  { key: 'GOOGLE_CLIENT_SECRET', level: 'optional', example: '' },
  { key: 'GOOGLE_REDIRECT_URI', level: 'optional', example: '' },
  { key: 'GOOGLE_LOGIN_REDIRECT_URI', level: 'optional', example: '' },
  { key: 'RAZORPAY_KEY_ID', level: 'production', example: '', note: 'Payments run on mock keys without this' },
  { key: 'RAZORPAY_KEY_SECRET', level: 'production', example: '' },
  { key: 'UNSPLASH_ACCESS_KEY', level: 'optional', example: '' },

  // --- whatsapp / instagram ---
  { key: 'WHATSAPP_PHONE_NUMBER_ID', level: 'optional', example: '' },
  { key: 'WHATSAPP_ACCESS_TOKEN', level: 'optional', example: '' },
  { key: 'WHATSAPP_VERIFY_TOKEN', level: 'optional', example: '' },
  { key: 'WHATSAPP_API_VERSION', level: 'optional', example: 'v20.0' },
  { key: 'FACEBOOK_APP_ID', level: 'optional', example: '' },
  { key: 'FACEBOOK_APP_SECRET', level: 'optional', example: '' },

  // --- feature flags ---
  { key: 'ENABLE_INSTAGRAM', level: 'optional', example: 'false', note: 'Instagram Direct uses an unofficial client - off by default' },
  { key: 'ENABLE_WHATSAPP_WEB', level: 'optional', example: 'true' },
  { key: 'ENABLE_AI_AUTOPILOT', level: 'optional', example: 'true' },
  { key: 'IG_POLL_INTERVAL_MS', level: 'optional', example: '60000' },
  { key: 'IG_FIRST_POLL_DELAY_MS', level: 'optional', example: '45000' },

  // --- mail ---
  { key: 'SMTP_HOST', level: 'optional', example: '' },
  { key: 'SMTP_PORT', level: 'optional', example: '587' },
  { key: 'SMTP_USER', level: 'optional', example: '' },
  { key: 'SMTP_PASS', level: 'optional', example: '' },
  { key: 'SMTP_SECURE', level: 'optional', example: 'false' },
  { key: 'RESEND_API_KEY', level: 'optional', example: '', note: 'Transactional email provider' },
  { key: 'EMAIL_FROM', level: 'optional', example: '', note: 'Sender address for outgoing email' },

  // --- misc ---
  { key: 'PGSSL', level: 'optional', example: 'false' },
  { key: 'DEFAULT_TRIAL_DAYS', level: 'optional', example: '30' },
  { key: 'RATE_LIMIT_MAX', level: 'optional', example: '200' },
  { key: 'RATE_LIMIT_WINDOW_MS', level: 'optional', example: '900000' },
  { key: 'LOG_LEVEL', level: 'optional', example: 'info' },
];

const FRONTEND_ENV = [
  { key: 'VITE_API_URL', level: 'production', example: 'http://localhost:5001/api', note: 'Backend base URL' },
  { key: 'VITE_RAZORPAY_KEY_ID', level: 'production', example: 'rzp_test_xxxxxxxx' },
  { key: 'VITE_TRIAL_DAYS', level: 'optional', example: '30' },
];

module.exports = { BACKEND_ENV, FRONTEND_ENV };
