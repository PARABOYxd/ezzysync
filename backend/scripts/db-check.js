#!/usr/bin/env node
/**
 * Step-by-step Postgres connectivity diagnostics.
 *
 *   node scripts/db-check.js            (reads DATABASE_URL / PGSSL from env or .env)
 *
 * Runs each layer in order and stops at the first one that fails, so the log
 * says exactly where the connection breaks:
 *   1. URL parse   2. DNS   3. TCP   4. Postgres login (SSL, then plain)
 *   5. Queries: server info, schema, extensions, write permission, connections
 *
 * Env:
 *   DATABASE_URL   required
 *   PGSSL          'true' to mirror the app's SSL setting (default: try both)
 *   DB_REGION      Render region used to expand an internal host (e.g. 'oregon')
 *                  when this runs outside Render. Default: oregon.
 *
 * Exit code 0 = all checks passed, 1 = a check failed. The password is never printed.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const dns = require('dns').promises;
const net = require('net');
const { Client } = require('pg');

const TIMEOUT_MS = 15000;
const results = [];
const onRender = !!process.env.RENDER;
const gha = !!process.env.GITHUB_ACTIONS;

function log(msg) {
  console.log(msg);
}
function record(name, ok, detail, hint) {
  results.push({ name, ok, detail, hint });
  log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` - ${detail}` : ''}`);
  if (!ok && hint) log(`      hint: ${hint}`);
}
function group(title) {
  log(gha ? `::group::${title}` : `\n=== ${title} ===`);
}
function endGroup() {
  if (gha) log('::endgroup::');
}

function hintFor(err) {
  const code = err.code || '';
  const msg = err.message || '';
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN')
    return 'Hostname does not resolve. A short Render host (dpg-xxx-a) only resolves for services in the SAME region and workspace as the DB. Use the External URL otherwise.';
  if (code === 'ECONNREFUSED') return 'Host reachable but nothing listening on that port. Wrong port, or the DB is suspended.';
  if (code === 'ETIMEDOUT' || /timeout/i.test(msg))
    return 'No response. Firewall/IP allowlist dropping packets, or the DB is down.';
  if (code === 'ECONNRESET' || /terminated unexpectedly/i.test(msg))
    return 'Server closed the connection before auth. On Render this is almost always Access Control (IP allowlist) rejecting this IP, or SSL required.';
  if (code === '28P01') return 'Password authentication failed. Password is wrong or was rotated.';
  if (code === '28000') return 'No access rule for this user/host, or SSL is required. Try PGSSL=true.';
  if (code === '3D000') return 'Database name in the URL does not exist.';
  if (code === '53300') return 'Too many connections. Connection limit for this plan reached.';
  if (/SSL|self.signed|certificate/i.test(msg)) return 'SSL problem. Toggle PGSSL or check the server SSL requirement.';
  return undefined;
}

function errText(err) {
  return [err.code, err.message].filter(Boolean).join(' ');
}

function tcpProbe(host, port) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const sock = net.connect({ host, port });
    sock.setTimeout(TIMEOUT_MS);
    sock.once('connect', () => {
      sock.destroy();
      resolve(Date.now() - started);
    });
    sock.once('timeout', () => {
      sock.destroy();
      const e = new Error(`TCP connect timed out after ${TIMEOUT_MS}ms`);
      e.code = 'ETIMEDOUT';
      reject(e);
    });
    sock.once('error', reject);
  });
}

async function tryLogin(connectionString, ssl) {
  const client = new Client({ connectionString, ssl, connectionTimeoutMillis: TIMEOUT_MS });
  const started = Date.now();
  await client.connect();
  return { client, ms: Date.now() - started };
}

async function runQueries(client) {
  const q = async (name, sql, fmt, hintOnFail) => {
    try {
      const started = Date.now();
      const r = await client.query(sql);
      record(name, true, `${fmt(r)} (${Date.now() - started}ms)`);
      return r;
    } catch (err) {
      record(name, false, errText(err), hintOnFail || hintFor(err));
      return null;
    }
  };

  await q(
    'Server info',
    `select current_database() db, current_user usr, now() at time zone 'utc' utc_now,
            split_part(version(), ',', 1) version`,
    (r) => {
      const x = r.rows[0];
      return `db=${x.db} user=${x.usr} ${x.version} utc=${x.utc_now.toISOString?.() || x.utc_now}`;
    }
  );

  await q(
    'SSL in use',
    `select coalesce((select ssl from pg_stat_ssl where pid = pg_backend_pid()), false) ssl`,
    (r) => `ssl=${r.rows[0].ssl}`
  );

  const tables = await q(
    'Schema (public tables)',
    `select table_name from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE' order by 1`,
    (r) =>
      r.rowCount === 0
        ? '0 tables - empty DB, app ensureSchema() will create them on first start'
        : `${r.rowCount} tables: ${r.rows.map((x) => x.table_name).join(', ')}`
  );
  if (tables && tables.rowCount > 0) {
    await q(
      'Approx row counts',
      `select relname, n_live_tup from pg_stat_user_tables order by n_live_tup desc limit 10`,
      (r) => r.rows.map((x) => `${x.relname}=${x.n_live_tup}`).join(', ') || 'n/a'
    );
  }

  await q(
    'Extensions',
    `select string_agg(extname || ' ' || extversion, ', ') ext,
            bool_or(extname = 'pgcrypto') has_pgcrypto,
            (select count(*) from pg_available_extensions where name = 'pgcrypto') > 0 pgcrypto_available
       from pg_extension`,
    (r) => {
      const x = r.rows[0];
      return `${x.ext}; pgcrypto installed=${!!x.has_pgcrypto} available=${x.pgcrypto_available}`;
    }
  );

  // Write permission without leaving anything behind.
  try {
    await client.query('begin');
    await client.query('create temp table __db_check (id int)');
    await client.query('insert into __db_check values (1)');
    await client.query('rollback');
    record('Write permission', true, 'create/insert in a rolled-back transaction succeeded');
  } catch (err) {
    await client.query('rollback').catch(() => {});
    record('Write permission', false, errText(err), 'User cannot write. DB may be read-only or suspended for exceeding storage.');
  }
  

  await q(
    'Can create in public schema',
    `select has_schema_privilege(current_user, 'public', 'CREATE') can_create`,
    (r) => `can_create=${r.rows[0].can_create}`
  ).then((r) => {
    if (r && !r.rows[0].can_create) {
      const last = results[results.length - 1];
      last.ok = false;
      last.hint = 'ensureSchema() needs CREATE on schema public.';
      log(`FAIL  (overriding) ${last.name} - user cannot CREATE in public; ${last.hint}`);
    }
  });

  await q(
    'Connections',
    `select (select count(*) from pg_stat_activity where datname = current_database()) in_use,
            current_setting('max_connections') max_conn`,
    (r) => `in_use=${r.rows[0].in_use} max=${r.rows[0].max_conn}`
  );

  await q(
    'Database size',
    `select pg_size_pretty(pg_database_size(current_database())) size`,
    (r) => r.rows[0].size
  );
}

function writeSummary() {
  const failed = results.filter((r) => !r.ok);
  log('\n=== SUMMARY ===');
  for (const r of results) log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}`);
  log(failed.length ? `\nRESULT: FAILED at "${failed[0].name}"` : '\nRESULT: ALL CHECKS PASSED');

  if (process.env.GITHUB_STEP_SUMMARY) {
    const esc = (s) => String(s || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
    const md = [
      '## Database health check',
      '',
      '| | Check | Detail | Hint |',
      '|---|---|---|---|',
      ...results.map((r) => `| ${r.ok ? '✅' : '❌'} | ${esc(r.name)} | ${esc(r.detail)} | ${esc(r.hint)} |`),
      '',
      failed.length ? `**Failed at:** ${failed[0].name}` : '**All checks passed.**',
      '',
    ].join('\n');
    require('fs').appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  }
  return failed.length === 0;
}

async function main() {
  group('1. Configuration');
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    record('DATABASE_URL set', false, 'DATABASE_URL is empty', 'Set the DATABASE_URL env var / secret.');
    return writeSummary();
  }

  let url;
  try {
    url = new URL(raw);
  } catch (err) {
    record('DATABASE_URL parse', false, err.message, 'URL is malformed. Special characters in the password must be URL-encoded.');
    return writeSummary();
  }
  if (url.password && gha) log(`::add-mask::${decodeURIComponent(url.password)}`);

  const isInternalRender = /^dpg-[a-z0-9]+-a$/.test(url.hostname);
  log(`environment : ${onRender ? 'Render' : gha ? 'GitHub Actions' : 'local'}`);
  log(`host        : ${url.hostname}${isInternalRender ? '  (Render INTERNAL host)' : ''}`);
  log(`port        : ${url.port || 5432}`);
  log(`database    : ${url.pathname.replace(/^\//, '') || '(none)'}`);
  log(`user        : ${decodeURIComponent(url.username) || '(none)'}`);
  log(`password    : ${url.password ? `set (${decodeURIComponent(url.password).length} chars)` : 'MISSING'}`);
  log(`PGSSL       : ${process.env.PGSSL ?? '(unset)'}`);
  record('DATABASE_URL parse', true, `protocol=${url.protocol.replace(':', '')}`);

  if (isInternalRender && !onRender) {
    const region = process.env.DB_REGION || 'oregon';
    const ext = `${url.hostname}.${region}-postgres.render.com`;
    log(
      `NOTE: internal host only resolves inside Render (same region + workspace).` +
        ` Testing via external host ${ext} instead.`
    );
    url.hostname = ext;
  }
  const host = url.hostname;
  const port = Number(url.port || 5432);
  endGroup();

  group('2. DNS');
  try {
    const addrs = await dns.lookup(host, { all: true });
    record('DNS resolve', true, `${host} -> ${addrs.map((a) => a.address).join(', ')}`);
  } catch (err) {
    record('DNS resolve', false, errText(err), hintFor(err));
    endGroup();
    return writeSummary();
  }
  endGroup();

  group('3. TCP');
  try {
    const ms = await tcpProbe(host, port);
    record('TCP connect', true, `${host}:${port} open (${ms}ms)`);
  } catch (err) {
    record('TCP connect', false, errText(err), hintFor(err));
    endGroup();
    return writeSummary();
  }
  endGroup();

  group('4. Postgres login');
  const cs = url.toString();
  const order =
    process.env.PGSSL === 'true'
      ? [['ssl', { rejectUnauthorized: false }]]
      : process.env.PGSSL === 'false'
        ? [['no-ssl', false], ['ssl', { rejectUnauthorized: false }]]
        : [['ssl', { rejectUnauthorized: false }], ['no-ssl', false]];
  let client = null;
  for (const [label, ssl] of order) {
    try {
      const r = await tryLogin(cs, ssl);
      client = r.client;
      record(`Login (${label})`, true, `authenticated in ${r.ms}ms`);
      if (process.env.PGSSL === 'false' && label === 'ssl')
        log('      note: plain connection failed but SSL works -> set PGSSL=true for the app.');
      break;
    } catch (err) {
      record(`Login (${label})`, false, errText(err), hintFor(err));
    }
  }
  endGroup();
  if (!client) return writeSummary();

  group('5. Queries');
  try {
    await runQueries(client);
  } finally {
    await client.end().catch(() => {});
  }
  endGroup();

  // A failed fallback login attempt is fine if another mode succeeded.
  const loggedIn = results.some((r) => r.name.startsWith('Login') && r.ok);
  if (loggedIn) results.forEach((r) => r.name.startsWith('Login') && !r.ok && (r.ok = true, r.detail += ' (fallback succeeded)'));
  return writeSummary();
}

main()
  .then((ok) => process.exit(ok ? 0 : 1))
  .catch((err) => {
    console.error('Unexpected error in db-check:', err);
    process.exit(1);
  });
