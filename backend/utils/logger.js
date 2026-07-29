const path = require('path');
const pino = require('pino');
const env = require('../config/env');

const isDev = env.nodeEnv !== 'production';
const logsDir = path.join(__dirname, '..', 'logs');

/**
 * Persists one warn/error+ log line to Postgres (app_logs table). Lazily
 * requires logRepository (rather than at top-of-file) so this module
 * doesn't create a circular require with config/db.js, which itself
 * imports this logger for its own [module: 'db'] logging.
 * Fire-and-forget: a DB hiccup here must never crash or slow a request.
 */
function persistToDb(level, bindings, context, message) {
  try {
    const logRepository = require('../repositories/logRepository');
    logRepository
      .createLog({
        tenantId: bindings.tenantId || context.tenantId || null,
        userId: bindings.userId || context.userId || null,
        level: pino.levels.labels[level] || String(level),
        message: String(message || ''),
        context,
        reqId: bindings.reqId || context.reqId || null,
      })
      .catch(() => {});
  } catch {
    // logRepository/db not ready yet (e.g. during very early boot) - skip silently.
  }
}

/**
 * Pulls the merging-object and message out of a pino log call's argument
 * list. Hooks run BEFORE pino-http's own serializers (see
 * middleware/requestLogger.js), so req/res here are still the raw,
 * circular Express/Node objects for the auto-generated request-completion
 * log - they're reduced to the same safe shape the file/stdout serializers
 * use before this ever reaches JSON.stringify.
 */
function parseLogArgs(inputArgs) {
  if (inputArgs.length && typeof inputArgs[0] === 'object' && inputArgs[0] !== null) {
    const { err, req, res, ...rest } = inputArgs[0];
    const context = { ...rest };
    if (err) context.err = { message: err.message, stack: err.stack, ...err };
    if (req) context.req = { method: req.method, url: req.url || req.originalUrl };
    if (res) context.res = { statusCode: res.statusCode };
    return { context, message: inputArgs[1] || '' };
  }
  return { context: {}, message: inputArgs[0] || '' };
}

const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    err: pino.stdSerializers.err,
  },
  redact: {
    paths: [
      'password',
      'newPassword',
      'otp',
      'token',
      'accessToken',
      'refreshToken',
      'req.body.password',
      'req.body.newPassword',
      'req.body.otp',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[REDACTED]',
  },
  // Every warn/error+ call also lands a row in app_logs, tagged with
  // whatever tenantId/userId/reqId the calling logger (req.log child) is
  // bound to - see middleware/authMiddleware.js and requestLogger.js.
  hooks: {
    logMethod(inputArgs, method, level) {
      if (level >= 40) {
        const bindings = typeof this.bindings === 'function' ? this.bindings() : {};
        const { context, message } = parseLogArgs(inputArgs);
        persistToDb(level, bindings, context, message);
      }
      return method.apply(this, inputArgs);
    },
  },
  transport: {
    targets: [
      // Human-readable stream: colorized pretty-print in dev, plain JSON to
      // stdout in production (captured by the hosting platform's log viewer).
      isDev
        ? {
            target: 'pino-pretty',
            level: process.env.LOG_LEVEL || 'debug',
            options: { colorize: true, translateTime: 'yyyy-mm-dd HH:MM:ss.l', ignore: 'pid,hostname' },
          }
        : { target: 'pino/file', level: 'info', options: { destination: 1 } },
      // Combined rotating file: everything info+, one file per day, keep 7 days.
      {
        target: 'pino-roll',
        level: 'info',
        options: {
          file: path.join(logsDir, 'app'),
          frequency: 'daily',
          dateFormat: 'yyyy-MM-dd',
          extension: '.log',
          mkdir: true,
          limit: { count: 6 }, // 6 rotated + 1 active = 7 days retained
        },
      },
      // Segregated error file: warn+ only, so problems are easy to find
      // without wading through routine request-completion lines.
      {
        target: 'pino-roll',
        level: 'warn',
        options: {
          file: path.join(logsDir, 'error'),
          frequency: 'daily',
          dateFormat: 'yyyy-MM-dd',
          extension: '.log',
          mkdir: true,
          limit: { count: 6 },
        },
      },
    ],
  },
});

module.exports = logger;
