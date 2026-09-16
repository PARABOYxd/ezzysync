/**
 * Formalizes the error convention already used ~60 times across this
 * codebase (`const err = new Error('...'); err.status = 404; throw err;`) as
 * a small class hierarchy - not a replacement for it. `errorHandler.js`
 * already only reads `err.status`/`err.message`, so a plain `new Error()`
 * with `.status` set by hand and an `AppError` subclass are interchangeable
 * to everything downstream. Use these in new code and wherever a file is
 * already being touched; there is no mass migration of the existing
 * call sites planned or needed.
 */
class AppError extends Error {
  constructor(message, status = 500, code = null) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    if (code) this.code = code;
  }
}

class ValidationError extends AppError {
  constructor(message, code = null) {
    super(message, 400, code);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Not found.', code = null) {
    super(message, 404, code);
  }
}

class ConflictError extends AppError {
  constructor(message, code = null) {
    super(message, 409, code);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required.', code = null) {
    super(message, 401, code);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Not allowed.', code = null) {
    super(message, 403, code);
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  AuthenticationError,
  AuthorizationError,
};
