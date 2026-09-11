/**
 * A real, empty Postgres for every test run.
 *
 * Almost every serious bug this codebase has had was invisible on a developer
 * machine and only appeared on a fresh database: an ON CONFLICT with no
 * matching unique index, a column dropped from the schema but still written
 * to, a migration whose steps ran in the wrong order. A dev database keeps old
 * columns and old rows around and hides all of it.
 *
 * So the tests do not mock the database. They create one, run the real
 * bootstrap and the real migrations against it, and drop it at the end. If the
 * schema is wrong, the tests fail for the same reason production would.
 */
const path = require('path');
const { Client } = require('pg');

// The app's own .env, so tests reach the same Postgres the developer already
// has running rather than needing a second set of credentials. CI overrides
// DATABASE_URL with its service container instead.
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const ADMIN_URL =
  process.env.TEST_DATABASE_ADMIN_URL ||
  process.env.DATABASE_URL ||
  'postgres://postgres:postgres@localhost:5432/postgres';

// A per-run name, so two runs (or a run and a dev server) never share state.
const TEST_DB = `ezzysync_test_${process.pid}`;

function adminUrlFor(database) {
  const url = new URL(ADMIN_URL);
  url.pathname = `/${database}`;
  return url.toString();
}

async function withAdmin(fn) {
  // Connect to `postgres`, not the target: you cannot drop a database you are
  // connected to.
  const client = new Client({ connectionString: adminUrlFor('postgres') });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function createTestDatabase() {
  await withAdmin(async (client) => {
    await client.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
    await client.query(`CREATE DATABASE ${TEST_DB}`);
  });

  // Every module reads the connection string through config/env at require
  // time, so this has to be set before anything else is loaded.
  process.env.DATABASE_URL = adminUrlFor(TEST_DB);
  return process.env.DATABASE_URL;
}

async function dropTestDatabase() {
  const { pool } = require('../config/db');
  await pool.end().catch(() => {});

  await withAdmin(async (client) => {
    // Anything still holding the database open would block the drop.
    await client.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [TEST_DB]
    );
    await client.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
  });
}

module.exports = { createTestDatabase, dropTestDatabase, TEST_DB };
