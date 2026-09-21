/**
 * The environment the app is allowed to see during a QA run.
 *
 * Every value here is a deliberate fake. A matrix run that picked up a real
 * Razorpay key or a real Meta token from the developer's .env would be one
 * bad-input case away from doing something real to a live account, and the
 * network guard should be the second line of defence, not the only one.
 *
 * Feature flags are forced ON so the flagged routers (WhatsApp Web, AI,
 * Instagram) are mounted and therefore tested. A route that only exists on
 * someone's laptop is exactly the kind of thing this suite should cover.
 */
export function primeEnv() {
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'silent';

  process.env.JWT_SECRET = 'qa-matrix-jwt-secret-not-a-real-one';
  process.env.OTP_SECRET = 'qa-matrix-otp-secret-not-a-real-one';
  process.env.TOKEN_ENCRYPTION_KEY = 'b'.repeat(64);

  process.env.FACEBOOK_APP_ID = 'qa_app_id';
  process.env.FACEBOOK_APP_SECRET = 'qa_app_secret';
  process.env.WHATSAPP_VERIFY_TOKEN = 'qa_verify_token';
  process.env.WHATSAPP_PHONE_NUMBER_ID = 'qa_phone_number_id';
  process.env.WHATSAPP_ACCESS_TOKEN = 'qa_access_token';
  process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN = 'qa_ig_verify_token';

  process.env.RAZORPAY_KEY_ID = 'rzp_test_qaMatrixKey';
  process.env.RAZORPAY_KEY_SECRET = 'qaMatrixSecret';
  process.env.RAZORPAY_WEBHOOK_SECRET = 'qaMatrixWebhookSecret';

  // Providers that would otherwise send something to a real person.
  process.env.RESEND_API_KEY = '';
  process.env.EMAIL_FROM = 'qa@qa.invalid';
  process.env.SMTP_HOST = '';
  process.env.GEMINI_API_KEY = '';
  process.env.OPENAI_API_KEY = '';
  process.env.R2_ACCESS_KEY_ID = '';
  process.env.R2_SECRET_ACCESS_KEY = '';
  process.env.GOOGLE_CLIENT_ID = 'qa-google-client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'qa-google-client-secret';

  process.env.FRONTEND_URL = 'http://localhost:5173';

  // Mount every optional router, so flagged routes are covered too.
  process.env.ENABLE_INSTAGRAM = 'true';
  process.env.ENABLE_WHATSAPP_WEB = 'true';
  process.env.ENABLE_AI_AUTOPILOT = 'true';
}
