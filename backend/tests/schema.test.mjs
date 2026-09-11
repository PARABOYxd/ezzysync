import { describe, it, expect } from 'vitest';
import { db, appRequire } from './app.mjs';

const { query } = db;

/**
 * The schema on a database that has never seen this app before.
 *
 * Every one of these assertions exists because the thing it checks was once
 * broken and only showed up on a fresh database - the dev machine kept the old
 * column, or the old index, and nothing failed until a real deploy.
 */
describe('schema on a fresh database', () => {
  it('runs every migration exactly once', async () => {
    const { rows } = await query('SELECT name FROM schema_migrations ORDER BY name');
    const names = rows.map((r) => r.name);
    expect(names.length).toBeGreaterThan(0);
    expect(new Set(names).size).toBe(names.length);
  });

  it('is idempotent - a second run changes nothing', async () => {
    const before = await query('SELECT count(*)::int c FROM schema_migrations');
    const { ensureSchema } = db;
    const { runMigrations } = appRequire('../config/migrations');
    await ensureSchema();
    await runMigrations();
    const after = await query('SELECT count(*)::int c FROM schema_migrations');
    expect(after.rows[0].c).toBe(before.rows[0].c);
  });

  it('enforces one chat per phone per tenant', async () => {
    // Without this index, "9812345678" and "919812345678" became two chats for
    // one person, and a background merge later deleted whichever the agent had
    // open.
    const { rows } = await query(`
      SELECT indexdef FROM pg_indexes
       WHERE tablename = 'whatsapp_chats' AND indexdef ILIKE '%unique%phone_key%'
    `);
    expect(rows.length).toBeGreaterThan(0);
  });

  it('enforces a unique message id', async () => {
    // ON CONFLICT (message_id) needs this index to exist. Without it every
    // insert threw on a fresh database.
    const { rows } = await query(`
      SELECT indexdef FROM pg_indexes
       WHERE tablename = 'whatsapp_messages' AND indexdef ILIKE '%unique%(message_id)%'
    `);
    expect(rows.length).toBeGreaterThan(0);
  });

  it('has the columns the WhatsApp code writes to', async () => {
    // A column dropped from the schema but still written to is how Instagram
    // DMs silently stopped reaching the inbox.
    const expected = {
      whatsapp_chats: ['tenant_id', 'phone', 'phone_key', 'jid', 'ai_enabled', 'needs_human', 'opted_out', 'opted_out_at', 'transport', 'last_inbound_at'],
      whatsapp_messages: ['tenant_id', 'chat_id', 'message_id', 'direction', 'sender', 'status', 'message_timestamp', 'user_id'],
      whatsapp_templates: ['tenant_id', 'name', 'body', 'buttons', 'is_starter'],
      whatsapp_auth_state: ['tenant_id', 'category', 'key_id', 'value'],
    };

    for (const [table, columns] of Object.entries(expected)) {
      const { rows } = await query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
        [table]
      );
      const present = new Set(rows.map((r) => r.column_name));
      for (const column of columns) {
        expect(present.has(column), `${table}.${column} is missing`).toBe(true);
      }
    }
  });
});
