/* eslint-disable no-unused-vars */
const logger = require('../utils/logger');

function notFoundHandler(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  // req.log is already bound with tenantId/userId (see authMiddleware.js
  // child logger) - no need to re-pass them here.
  const log = req.log || logger;
  log[status >= 500 ? 'error' : 'warn'](
    { err, status },
    `Unhandled error on ${req.method} ${req.originalUrl}`
  );

  res.status(status).json({
    message: err.message || 'Something went wrong on the server.',
  });
}

module.exports = { notFoundHandler, errorHandler };
