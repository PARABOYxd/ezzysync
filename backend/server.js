const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
// Razorpay payment integration active
const env = require('./config/env');
const logger = require('./utils/logger');
const requestLogger = require('./middleware/requestLogger');
const { ensureSchema } = require('./config/db');
const { runMigrations } = require('./config/migrations');
const { initScheduler } = require('./jobs/cronJobs');
const emailService = require('./services/emailService');

const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const leadRoutes = require('./routes/leadRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const profileRoutes = require('./routes/profileRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const googleRoutes = require("./routes/googleRoutes");
const userRoutes = require('./routes/userRoutes');
const quotationRoutes = require('./routes/quotationRoutes');
const publicRoutes = require('./routes/publicRoutes');
const aiRoutes = require('./routes/aiRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const customerRoutes = require('./routes/customerRoutes');
const followUpRoutes = require('./routes/followUpRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const whatsappWebRoutes = require('./routes/whatsappWebRoutes');
const planRoutes = require('./routes/planRoutes');
const whatsappWebService = require('./services/whatsappWebService');

const expenseRoutes = require('./routes/expenseRoutes');
const batchRoutes = require('./routes/batchRoutes');
const hotelRoutes = require('./routes/hotelRoutes');
const instagramRoutes = require('./routes/instagramRoutes');
const instagramDirectRoutes = require('./routes/instagramDirectRoutes');
const instagramDirectService = require('./services/instagramDirectService');
const whatsappTemplateRoutes = require('./routes/whatsappTemplateRoutes');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Trust the first proxy hop (Nginx / Cloudflare / Heroku / AWS ALB)
// so express-rate-limit correctly reads the client IP from X-Forwarded-For.
// Also ensures req.ip resolves to the real visitor rather than the proxy.
// CRITICAL FOR MULTI-TENANT: each tenant user has their own IP; rate limiters
// below key on — without this every user would share one IP-based bucket.
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
  })
);
const allowedOrigins = [
  env.frontendUrl,
  'https://ezzysync.com',
  'https://www.ezzysync.com',
  'http://localhost:5173',
  'http://localhost:5001',
  'http://localhost:3000',
];

/**
 * CORS is decided per request, because one endpoint has to behave differently
 * from every other.
 *
 * Agencies paste the lead-capture embed form into their own websites, so the
 * browser sends whatever origin that site has - a domain we cannot know in
 * advance and will never have in the allowlist above. The single allowlist
 * rule therefore rejected every real submission: the visitor filled in the
 * form, the fetch was blocked before it left the browser, and the lead never
 * arrived. Nothing was logged, because the request never reached us.
 *
 * Opening that one path is safe: it takes no cookies or Authorization header
 * (`credentials: false`, so a browser will not attach either), it
 * authenticates by the rotatable key in its URL, it is rate limited, and it
 * can only ever create a lead for the tenant that key belongs to. Anyone who
 * can read the embed code can already post to it from a script - CORS was
 * never what protected it.
 *
 * Everything else keeps the strict allowlist, credentials included.
 */
const PUBLIC_LEAD_CAPTURE_PATH = '/api/public/leads';

app.use(
  cors((req, callback) => {
    if (req.path.startsWith(PUBLIC_LEAD_CAPTURE_PATH)) {
      return callback(null, { origin: '*', credentials: false });
    }

    const origin = req.headers.origin;
    // Same-origin requests, curl and server-to-server calls send no Origin.
    if (!origin) return callback(null, { origin: true, credentials: true });

    const isAllowed = allowedOrigins.some((o) => {
      if (!o) return false;
      return o.replace(/\/$/, '') === origin.replace(/\/$/, '');
    });

    if (!isAllowed) {
      logger.warn({ origin, path: req.path }, 'CORS request blocked from origin');
      return callback(new Error(`CORS policy does not allow access from origin ${origin}`));
    }

    callback(null, { origin: true, credentials: true });
  })
);
app.use(
  express.json({
    limit: '2mb',
    // Meta signs the exact bytes it sent, so the signature check needs them -
    // a re-serialised req.body would not produce the same HMAC.
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(requestLogger);
app.use('/api', apiLimiter);
app.use("/api/google", googleRoutes);
const { requireActiveSubscription } = require('./middleware/planMiddleware');

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
// Deliberately not behind requireActiveSubscription - a locked-out tenant
// still has to be able to read the plan that is locking them out.
app.use('/api/plans', planRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/payments', paymentRoutes);

// Core CRM business routes (Accessible by tenants; AI is strictly gated by active subscription)
app.use('/api/bookings', bookingRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/whatsapp', whatsappRoutes);
// Feature flags gate the routes themselves, not just the menu. The frontend
// reads the same flags from /api/public/features to hide the UI, but hiding a
// button is not disabling a feature - a flag that only the client honours is
// not a flag.
if (env.features.whatsappWeb) {
  app.use('/api/whatsapp-web', whatsappWebRoutes);
}
app.use('/api/settings', settingsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/follow-ups', followUpRoutes);
// AI Travel Tools strictly require an active subscription
if (env.features.aiAutopilot) {
  app.use('/api/ai', requireActiveSubscription, aiRoutes);
}
app.use('/api/expenses', expenseRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/hotels', hotelRoutes);
if (env.features.instagram) {
  app.use('/api/instagram', instagramRoutes);
  app.use('/api/instagram-direct', instagramDirectRoutes);
}
app.use('/api/whatsapp/templates', whatsappTemplateRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  try {
    await ensureSchema();
    // Numbered migrations run after the legacy bootstrap, so they can rely on
    // the tables it creates. A failure here stops the boot rather than serving
    // traffic on a half-migrated schema.
    await runMigrations();
  } catch (err) {
    logger.error({ err }, 'Failed to initialize DB schema. Check DATABASE_URL and that Postgres is reachable.');
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    logger.info({ port: env.port, env: env.nodeEnv }, 'JourneyFlow API started');

    // Say at boot whether outbound mail can leave at all. Without this the
    // first sign that RESEND_API_KEY or EMAIL_FROM is missing in an
    // environment is a 502 on someone's registration - the very first thing a
    // new customer does - with nothing in the deploy log to point at it.
    const mail = emailService.getEmailRouteStatus();
    if (mail.anyUsable) {
      logger.info(
        { routes: mail.routes.filter((r) => r.usable).map((r) => `${r.name} (${r.reason})`) },
        'Email is configured'
      );
    } else {
      logger.error(
        { routes: mail.routes.map((r) => `${r.name}: ${r.reason}`) },
        'NO EMAIL ROUTE IS CONFIGURED - registration OTPs and password resets will fail'
      );
    }
    initScheduler();
    whatsappWebService.autoInitConnectedSessions();
    if (env.features.instagram) {
      instagramDirectService.autoResumeConnectedSessions();
    }
  });
  const websocketService = require('./services/websocketService');
  websocketService.init(server);

  /**
   * Shuts down in the order that matters, on the platform's own signal.
   *
   * Railway sends SIGTERM and then kills the process a short time later. With
   * no handler, the outgoing container kept its WhatsApp socket open for that
   * whole window - while the incoming one was already connecting with the same
   * credentials. WhatsApp permits one connection per account and kicks the
   * other with 440, so an ordinary deploy could leave the inbox disconnected.
   *
   * WhatsApp goes first (and gets its queued keys written), then the HTTP
   * server stops accepting new work. The timeout is a backstop: if something
   * hangs, exiting is still better than being killed mid-write.
   */
  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down');

    const forceExit = setTimeout(() => {
      logger.warn('Shutdown took too long; exiting anyway');
      process.exit(0);
    }, 10000);
    forceExit.unref();

    try {
      await whatsappWebService.shutdownAllSessions();
    } catch (err) {
      logger.error({ err }, 'Error while closing WhatsApp sessions');
    }

    server.close(() => {
      clearTimeout(forceExit);
      logger.info('Shutdown complete');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

process.on('unhandledRejection', (err) => {
  logger.error({ err }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception');
  process.exit(1);
});

start();
