const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
// Razorpay payment integration active
const env = require('./config/env');
const logger = require('./utils/logger');
const requestLogger = require('./middleware/requestLogger');
const { ensureSchema } = require('./config/db');
const { initScheduler } = require('./jobs/cronJobs');

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

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed = allowedOrigins.some((o) => {
        if (!o) return false;
        return o.replace(/\/$/, '') === origin.replace(/\/$/, '');
      });
      if (isAllowed) {
        callback(null, true);
      } else {
        logger.warn({ origin }, 'CORS request blocked from origin');
        callback(new Error(`CORS policy does not allow access from origin ${origin}`));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
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

// Protected CRM business routes (Gated by active subscription / valid trial)
app.use('/api/bookings', requireActiveSubscription, bookingRoutes);
app.use('/api/leads', requireActiveSubscription, leadRoutes);
app.use('/api/dashboard', requireActiveSubscription, dashboardRoutes);
app.use('/api/invoices', requireActiveSubscription, invoiceRoutes);
app.use('/api/whatsapp', requireActiveSubscription, whatsappRoutes);
app.use('/api/whatsapp-web', requireActiveSubscription, whatsappWebRoutes);
app.use('/api/settings', requireActiveSubscription, settingsRoutes);
app.use('/api/upload', requireActiveSubscription, uploadRoutes);
app.use('/api/users', requireActiveSubscription, userRoutes);
app.use('/api/quotations', requireActiveSubscription, quotationRoutes);
app.use('/api/customers', requireActiveSubscription, customerRoutes);
app.use('/api/follow-ups', requireActiveSubscription, followUpRoutes);
app.use('/api/ai', requireActiveSubscription, aiRoutes);
app.use('/api/expenses', requireActiveSubscription, expenseRoutes);
app.use('/api/batches', requireActiveSubscription, batchRoutes);
app.use('/api/hotels', requireActiveSubscription, hotelRoutes);
if (env.features.instagram) {
  app.use('/api/instagram', requireActiveSubscription, instagramRoutes);
  app.use('/api/instagram-direct', requireActiveSubscription, instagramDirectRoutes);
}
app.use('/api/whatsapp/templates', requireActiveSubscription, whatsappTemplateRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  try {
    await ensureSchema();
  } catch (err) {
    logger.error({ err }, 'Failed to initialize DB schema. Check DATABASE_URL and that Postgres is reachable.');
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    logger.info({ port: env.port, env: env.nodeEnv }, 'JourneyFlow API started');
    initScheduler();
    whatsappWebService.autoInitConnectedSessions();
    if (env.features.instagram) {
      instagramDirectService.autoResumeConnectedSessions();
    }
  });
  const websocketService = require('./services/websocketService');
  websocketService.init(server);
}

process.on('unhandledRejection', (err) => {
  logger.error({ err }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception');
  process.exit(1);
});

start();
