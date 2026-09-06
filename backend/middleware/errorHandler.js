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

/**
 * Postgres error codes that describe something the user did, rather than
 * something the server got wrong. Worth translating: "duplicate key value
 * violates unique constraint \"users_email_key\"" tells an agent nothing,
 * while "that email is already registered" tells them exactly what to change.
 */
const PG_MESSAGES = {
  // A genuine conflict with what is already stored.
  '23505': { status: 409, message: 'That record already exists. Please check for a duplicate entry.' },
  '23503': { status: 409, message: 'This is still linked to other records, so it cannot be changed or removed yet.' },
  // The request itself was malformed - a missing field, an over-long value,
  // or an id that is not a valid UUID. Those are 400s: calling a mistyped id
  // a "conflict" tells the caller to look in the wrong place.
  '23502': { status: 400, message: 'A required field was left empty.' },
  '22001': { status: 400, message: 'One of the values is too long for its field.' },
  '22P02': { status: 400, message: 'One of the values is not in the expected format.' },
};

/**
 * Anything the server itself got wrong is reported to the user in plain
 * language, with a reference they can quote.
 *
 * The previous version returned `err.message` for every status, so internal
 * failures reached the browser verbatim - real examples from this codebase
 * include `relation "whatsapp_templates" does not exist`, `connect ETIMEDOUT
 * 127.0.0.1:5432` and `Cannot read properties of undefined (reading 'id')`.
 * That is meaningless to an agent and it leaks table names, hosts and internal
 * structure to anyone who can trigger a 500.
 *
 * A 4xx raised with an explicit `status` is different: those messages are
 * written for the user on purpose, so they pass through unchanged.
 */
function errorHandler(err, req, res, next) {
  const log = req.log || logger;
  const requestId = req.id || res.getHeader('X-Request-Id');

  if (err?.name === 'MulterError' && MULTER_MESSAGES[err.code]) {
    log.warn({ code: err.code }, 'Upload rejected');
    return res.status(400).json({ message: MULTER_MESSAGES[err.code], code: err.code });
  }

  // Body parsers reject malformed JSON with a SyntaxError carrying a status.
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    log.warn({ err }, 'Malformed JSON body');
    return res.status(400).json({ message: 'The request body was not valid JSON.' });
  }

  const pg = PG_MESSAGES[err?.code];
  if (pg) {
    log.warn({ err, pgCode: err.code }, 'Database rejected the request');
    return res.status(pg.status).json({ message: pg.message, requestId });
  }

  const status = err.status || 500;

  // req.log is already bound with tenantId/userId (see authMiddleware.js
  // child logger) - no need to re-pass them here.
  log[status >= 500 ? 'error' : 'warn'](
    { err, status },
    `Unhandled error on ${req.method} ${req.originalUrl}`
  );

  if (status >= 500) {
    return res.status(status).json({
      message:
        'Something went wrong on our side. Please try again — if it keeps happening, ' +
        'send us the reference below.',
      requestId,
    });
  }

  // A deliberate 4xx: the message was written to be read.
  res.status(status).json({ message: err.message || 'That request could not be completed.' });
}

module.exports = { notFoundHandler, errorHandler };
