/* eslint-disable no-unused-vars */
const logger = require('../utils/logger');

function notFoundHandler(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

/**
 * Multer signals upload problems with codes, not messages a user can read.
 * Left alone they surface as a bare 500, so an agent attaching nine files or
 * an oversized PDF is told "something went wrong" instead of what to fix.
 */
const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: 'That file is too large. Each attachment must be under 15 MB.',
  LIMIT_FILE_COUNT: 'Too many attachments. You can send up to 8 files at once.',
  LIMIT_UNEXPECTED_FILE: 'Too many attachments. You can send up to 8 files at once.',
  LIMIT_PART_COUNT: 'Too many parts in the upload. Please try with fewer files.',
};

function errorHandler(err, req, res, next) {
  if (err?.name === 'MulterError' && MULTER_MESSAGES[err.code]) {
    (req.log || logger).warn({ code: err.code }, 'Upload rejected');
    return res.status(400).json({ message: MULTER_MESSAGES[err.code], code: err.code });
  }

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
