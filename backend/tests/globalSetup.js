/**
 * Builds the test database once, before any test file runs.
 *
 * Done here rather than per file so the schema bootstrap and migrations are
 * paid for once, and so every test sees the same database - a suite where
 * each file builds its own is slow and hides ordering bugs between them.
 */
const { createTestDatabase, dropTestDatabase } = require('./setup');

module.exports = async function globalSetup() {
  // Quiet: the bootstrap logs a great deal, and it is not what a failing test
  // needs to show.
  process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';
  process.env.NODE_ENV = 'test';

  // Values the app expects to exist. Deliberately obvious fakes - a test that
  // reaches a real provider is a test that will fail on someone else's machine.
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-not-a-real-one';
  process.env.TOKEN_ENCRYPTION_KEY =
    process.env.TOKEN_ENCRYPTION_KEY || 'a'.repeat(64);
  process.env.FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || 'test_app_secret';
  process.env.WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'test_verify_token';

  await createTestDatabase();

  const { ensureSchema } = require('../config/db');
  const { runMigrations } = require('../config/migrations');
  await ensureSchema();
  await runMigrations();

  return async function teardown() {
    await dropTestDatabase();
  };
};
