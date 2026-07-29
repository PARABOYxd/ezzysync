const pinoHttp = require('pino-http');
const { randomUUID } = require('crypto');
const logger = require('../utils/logger');

/**
 * Logs one line per request (method, url, status, response time) plus
 * tenant/user context. customProps runs when the response finishes, which
 * is after requireAuth has already attached req.user for protected routes
 * - so tenantId/userId show up even though this middleware is mounted
 * before auth runs. req.log is also available in controllers/services for
 * ad-hoc logging that stays correlated to the same request.
 */
const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = req.headers['x-request-id'];
    const id = typeof existing === 'string' && existing ? existing : randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  customProps: (req) => ({
    tenantId: req.user?.tenantId,
    userId: req.user?.userId,
  }),
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.originalUrl} -> ${res.statusCode}`,
  customErrorMessage: (req, res, err) => `${req.method} ${req.originalUrl} -> ${res.statusCode} (${err.message})`,
  serializers: {
    req: (req) => ({ method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});

module.exports = requestLogger;
