/**
 * A throwaway Postgres for the matrix, built from the real bootstrap.
 *
 * The suite sends destructive input at every write endpoint it can find, so
 * it must never be pointed at a database anyone cares about. It creates its
 * own, named for this process, runs the app's own ensureSchema + migrations
 * against it, and drops it at the end - the same contract backend/tests uses,
 * under a different name so a QA run and a unit-test run can never collide.
 */
import path from 'node:path';
import { BACKEND_DIR, backendRequire } from './require.js';

const { Client } = backendRequire('pg');
backendRequire('dotenv').config({ path: path.join(BACKEND_DIR, '.env') });

const ADMIN_URL =
  process.env.QA_DATABASE_ADMIN_URL ||
  process.env.TEST_DATABASE_ADMIN_URL ||
  process.env.DATABASE_URL ||
  'postgres://postgres:postgres@localhost:5432/postgres';

export const QA_DB = `ezzysync_qa_matrix_${process.pid}`;

function urlFor(database) {
  const url = new URL(ADMIN_URL);
  url.pathname = `/${database}`;
  return url.toString();
}

async function withAdmin(fn) {
  const client = new Client({ connectionString: urlFor('postgres') });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export async function createQaDatabase() {
  await withAdmin(async (client) => {
    await client.query(`DROP DATABASE IF EXISTS ${QA_DB}`);
    await client.query(`CREATE DATABASE ${QA_DB}`);
  });
  // Read at require time by config/env, so it has to be set before any
  // application module is loaded.
  process.env.DATABASE_URL = urlFor(QA_DB);
  return process.env.DATABASE_URL;
}

export async function dropQaDatabase() {
  try {
    const { pool } = backendRequire('./config/db');
    await pool.end().catch(() => {});
  } catch { /* never loaded */ }

  await withAdmin(async (client) => {
    await client.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [QA_DB]
    );
    await client.query(`DROP DATABASE IF EXISTS ${QA_DB}`);
  });
}

export async function bootstrapSchema() {
  const { ensureSchema } = backendRequire('./config/db');
  const { runMigrations } = backendRequire('./config/migrations');
  await ensureSchema();
  await runMigrations();
}

export function adminConnectionTarget() {
  const url = new URL(ADMIN_URL);
  return `${url.hostname}:${url.port || 5432}`;
}
