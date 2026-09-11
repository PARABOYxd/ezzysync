const fs = require('fs');
const path = require('path');
const { pool } = require('./db');
const logger = require('../utils/logger').child({ module: 'migrations' });

/**
 * Numbered, run-once schema migrations.
 *
 * `ensureSchema()` re-runs every statement on every boot and keeps no record of
 * what has already happened, so order dependencies between its steps are
 * implicit and silent - add a column, backfill it, then index it, and getting
 * that sequence wrong fails into a `logger.warn` nobody reads. It also grows:
 * every change ever made is replayed at every start.
 *
 * This runs each file in `migrations/` exactly once, in filename order, inside
 * a transaction, and records it in `schema_migrations`. A failed migration
 * rolls back and stops the boot rather than leaving the schema half-changed.
 *
 * `ensureSchema()` is deliberately left alone - it owns the existing tables.
 * New schema work goes here.
 */

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function appliedMigrations() {
  const { rows } = await pool.query(`SELECT name FROM schema_migrations`);
  return new Set(rows.map((r) => r.name));
}

function pendingFiles(applied) {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort() // 001_, 002_, ... - the filename is the running order
    .filter((f) => !applied.has(f));
}

/**
 * Applies everything not yet applied.
 *
 * Each file is one transaction: it either lands completely or not at all, so a
 * migration that adds a column and backfills it can never leave the column
 * present but empty. Throwing on failure is deliberate - booting on a schema
 * that is half-migrated is how you get errors nobody can reproduce.
 */
async function runMigrations() {
  await ensureMigrationsTable();
  const applied = await appliedMigrations();
  const pending = pendingFiles(applied);

  if (!pending.length) {
    logger.info({ applied: applied.size }, 'Schema migrations up to date');
    return;
  }

  logger.info({ pending }, 'Applying schema migrations');

  for (const name of pending) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(`INSERT INTO schema_migrations (name) VALUES ($1)`, [name]);
      await client.query('COMMIT');
      logger.info({ name }, 'Migration applied');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      logger.error({ name, err }, 'Migration failed - the database is unchanged by it');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = { runMigrations };
