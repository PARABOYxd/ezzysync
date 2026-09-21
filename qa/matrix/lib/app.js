/**
 * The application under test, assembled the way server.js assembles it.
 *
 * server.js cannot be imported: it calls start() at the bottom, which binds a
 * port, opens WhatsApp sockets and starts cron. So the middleware stack and
 * the mount table are mirrored here instead - same order, same guards, same
 * error handlers, nothing stubbed.
 *
 * Mirroring invites drift, so the drift rule (rules/13-mount-parity.js) reads
 * server.js and fails the run when a mount exists there and not here. That
 * check is the reason this file is allowed to be a copy.
 */
import { backendRequire } from './require.js';

export function buildApp() {
  const express = backendRequire('express');
  const cors = backendRequire('cors');
  const helmet = backendRequire('helmet');

  const env = backendRequire('./config/env');
  const requestLogger = backendRequire('./middleware/requestLogger');
  const { apiLimiter } = backendRequire('./middleware/rateLimiter');
  const { notFoundHandler, errorHandler } = backendRequire('./middleware/errorHandler');
  const { requireActiveSubscription } = backendRequire('./middleware/planMiddleware');

  const app = express();
  app.set('trust proxy', 1);

  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));

  const allowedOrigins = [
    env.frontendUrl,
    'https://ezzysync.com',
    'https://www.ezzysync.com',
    'http://localhost:5173',
    'http://localhost:5001',
    'http://localhost:3000',
  ];
  const PUBLIC_LEAD_CAPTURE_PATH = '/api/public/leads';

  app.use(
    cors((req, callback) => {
      if (req.path.startsWith(PUBLIC_LEAD_CAPTURE_PATH)) {
        return callback(null, { origin: '*', credentials: false });
      }
      const origin = req.headers.origin;
      if (!origin) return callback(null, { origin: true, credentials: true });
      const isAllowed = allowedOrigins.some((o) => o && o.replace(/\/$/, '') === origin.replace(/\/$/, ''));
      if (!isAllowed) return callback(new Error(`CORS policy does not allow access from origin ${origin}`));
      callback(null, { origin: true, credentials: true });
    })
  );

  app.use(
    express.json({
      limit: '2mb',
      verify: (req, res, buf) => { req.rawBody = buf; },
    })
  );

  app.use(requestLogger);
  app.use('/api', apiLimiter);

  const mount = (p, ...handlers) => app.use(p, ...handlers);

  mount('/api/google', backendRequire('./routes/googleRoutes'));
  app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

  mount('/api/public', backendRequire('./routes/publicRoutes'));
  mount('/api/auth', backendRequire('./routes/authRoutes'));
  mount('/api/plans', backendRequire('./routes/planRoutes'));
  mount('/api/profile', backendRequire('./routes/profileRoutes'));
  mount('/api/payments', backendRequire('./routes/paymentRoutes'));
  mount('/api/bookings', backendRequire('./routes/bookingRoutes'));
  mount('/api/leads', backendRequire('./routes/leadRoutes'));
  mount('/api/dashboard', backendRequire('./routes/dashboardRoutes'));
  mount('/api/invoices', backendRequire('./routes/invoiceRoutes'));
  mount('/api/whatsapp', backendRequire('./routes/whatsappRoutes'));
  if (env.features.whatsappWeb) mount('/api/whatsapp-web', backendRequire('./routes/whatsappWebRoutes'));
  mount('/api/settings', backendRequire('./routes/settingsRoutes'));
  mount('/api/upload', backendRequire('./routes/uploadRoutes'));
  mount('/api/users', backendRequire('./routes/userRoutes'));
  mount('/api/quotations', backendRequire('./routes/quotationRoutes'));
  mount('/api/customers', backendRequire('./routes/customerRoutes'));
  mount('/api/follow-ups', backendRequire('./routes/followUpRoutes'));
  if (env.features.aiAutopilot) mount('/api/ai', requireActiveSubscription, backendRequire('./routes/aiRoutes'));
  mount('/api/expenses', backendRequire('./routes/expenseRoutes'));
  mount('/api/batches', backendRequire('./routes/batchRoutes'));
  mount('/api/hotels', backendRequire('./routes/hotelRoutes'));
  if (env.features.instagram) {
    mount('/api/instagram', backendRequire('./routes/instagramRoutes'));
    mount('/api/instagram-direct', backendRequire('./routes/instagramDirectRoutes'));
  }
  mount('/api/whatsapp/templates', backendRequire('./routes/whatsappTemplateRoutes'));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

/** The mount table above, as data, for the parity rule to compare against. */
export const MOUNTED_PREFIXES = [
  '/api/google', '/api/public', '/api/auth', '/api/plans', '/api/profile',
  '/api/payments', '/api/bookings', '/api/leads', '/api/dashboard', '/api/invoices',
  '/api/whatsapp', '/api/whatsapp-web', '/api/settings', '/api/upload', '/api/users',
  '/api/quotations', '/api/customers', '/api/follow-ups', '/api/ai', '/api/expenses',
  '/api/batches', '/api/hotels', '/api/instagram', '/api/instagram-direct',
  '/api/whatsapp/templates',
];
