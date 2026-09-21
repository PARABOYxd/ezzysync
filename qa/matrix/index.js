/**
 * The matrix stage: build a world, generate every case, run them, report.
 *
 * Order matters more than usual here. The environment is primed and the
 * network is severed before a single application module is loaded, because
 * config/env reads process.env at require time and the WhatsApp and email
 * services would otherwise be holding real credentials by the time the first
 * case runs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { primeEnv } from './lib/env.js';
import { installNetworkGuard, blockedCount } from './lib/guard.js';

primeEnv();
installNetworkGuard();

const { createQaDatabase, dropQaDatabase, bootstrapSchema, QA_DB, adminConnectionTarget } = await import('./lib/db.js');
const { backendRequire, QA_DIR } = await import('./lib/require.js');
const { buildApp } = await import('./lib/app.js');
const { seedWorld } = await import('./lib/fixtures.js');
const { runAll, crashes } = await import('./lib/runner.js');
const { makeCase } = await import('./lib/case.js');
const { ENDPOINTS } = await import('./lib/inventory.js');
const reportLib = await import('./lib/report.js');

const RULES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'rules');

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

async function loadRules() {
  const files = fs.readdirSync(RULES_DIR).filter((f) => f.endsWith('.js')).sort();
  const rules = [];
  for (const file of files) {
    const mod = await import(new URL(`./rules/${file}`, import.meta.url).href);
    rules.push({ file, ...mod });
  }
  return rules;
}

function badTokensFor(ctx) {
  const jwt = backendRequire('jsonwebtoken');
  const env = backendRequire('./config/env');
  const claims = { userId: ctx.users.adminA.id, tenantId: ctx.tenantA.tenantId, role: 'ADMIN', email: ctx.users.adminA.email };

  return {
    algNone: jwt.sign(claims, '', { algorithm: 'none' }),
    wrongSignature: jwt.sign(claims, 'a-completely-different-secret', { expiresIn: '1h' }),
    expired: jwt.sign(claims, env.jwtSecret, { expiresIn: -60 }),
    deletedUser: jwt.sign({ ...claims, userId: 99999999 }, env.jwtSecret, { expiresIn: '1h' }),
  };
}

/**
 * A handful of ordinary reads, re-run between rules.
 *
 * Fuzzing writes as well as reads, and a value the API accepts but cannot
 * later render turns every subsequent list request into a 500 - which then
 * shows up as hundreds of failures on endpoints that were fine until
 * something poisoned a row. The canaries pin down when that happened: the
 * first rule after which they start failing is the rule that wrote the row.
 */
function canariesAfter(ruleName, ctx) {
  const paths = ['/api/leads', '/api/leads/pool', '/api/leads/pipeline', '/api/bookings', '/api/quotations', '/api/dashboard'];
  return paths.map((p) => makeCase({
    rule: 'canary',
    endpoint: null,
    title: `${p} still reads cleanly after the ${ruleName} cases`,
    method: 'get',
    path: p,
    token: ctx.users.adminA.token,
    checks: [{
      label: 'core-read-still-works',
      fn: (res) => res.status === 200,
      severity: 'critical',
      why: `An ordinary list request failed after the ${ruleName} cases ran. Something written earlier in the run left a row this endpoint cannot read - which means the API accepted data it cannot subsequently serve, and one bad record takes the whole screen down for that tenant.`,
    }],
    tags: ['canary', ruleName],
    meta: { afterRule: ruleName },
  }));
}

export async function runMatrix({ concurrency = 6, reportDir } = {}) {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  log(`  Postgres at ${adminConnectionTarget()} - creating ${QA_DB}`);
  await createQaDatabase();
  await bootstrapSchema();
  log('  Schema and migrations applied to the throwaway database');

  const app = buildApp();
  const { query } = backendRequire('./config/db');

  const world = await seedWorld(app, { query });
  log(`  Seeded 2 tenants, 4 users and ${Object.keys(world.resources.A).length} resource types`);
  if (world.seedFailures.length) {
    log(`  ${world.seedFailures.length} seed request(s) did not succeed - recorded as findings`);
  }

  // The public lead-capture key, which several rules need and no create
  // endpoint returns.
  const supertest = backendRequire('supertest');
  const keyRes = await supertest(app)
    .get('/api/settings/lead-capture-key')
    .set('Authorization', `Bearer ${world.users.adminA.token}`)
    .set('X-Forwarded-For', '10.1.1.1');
  world.resources.A.leadKey = keyRes.body?.publicLeadKey || keyRes.body?.key || keyRes.body?.leadCaptureKey || null;

  const ctx = {
    ...world,
    res: world.resources,
    badTokens: null,
  };
  ctx.badTokens = badTokensFor(ctx);

  const rules = await loadRules();
  const cases = [];
  const skipped = [];
  for (const rule of rules) {
    const { cases: ruleCases, skipped: ruleSkipped } = rule.generate(ctx);
    cases.push(...ruleCases);
    skipped.push(...(ruleSkipped || []));
    log(`  ${rule.name.padEnd(20)} ${String(ruleCases.length).padStart(6)} cases`);
    cases.push(...canariesAfter(rule.name, ctx));
  }

  log('');
  log(`  Running ${cases.length.toLocaleString()} cases at concurrency ${concurrency}...`);

  const results = await runAll(app, cases, {
    concurrency,
    onProgress: (done, total) => log(`    ${done.toLocaleString()} / ${total.toLocaleString()}`),
  });

  // A handler that threw from outside the request chain reaches the process
  // as an uncaughtException. The runner keeps going and records it here, with
  // whatever was in flight at the time, because a crash that takes the Node
  // process down in production is the most serious thing this suite can find.
  for (const crash of crashes) {
    results.push({
      id: `crash#${results.length}`,
      rule: 'process-stability',
      endpoint: crash.inFlight[0]?.meta?.endpoint || null,
      title: `Unhandled ${crash.kind}: ${crash.message}`,
      method: crash.inFlight[0]?.method || null,
      path: crash.inFlight[0]?.path || null,
      outcome: 'fail',
      durationMs: 0,
      tags: ['stability', 'crash'],
      failures: [{
        label: 'process-level-crash',
        severity: 'critical',
        why: 'Something threw where Express could not catch it - a callback or a detached promise. In production this is not a failed request, it is the whole Node process going down and taking every other in-flight request with it.',
        detail: {
          status: null,
          body: JSON.stringify({ message: crash.message, stack: crash.stack, inFlight: crash.inFlight.slice(0, 8) }).slice(0, 1200),
        },
      }],
    });
  }

  // Seed failures are real results too - a create endpoint that refused a
  // plainly valid payload is a finding, not a setup detail.
  for (const failure of world.seedFailures) {
    results.push({
      id: `seed#${failure.path}`,
      rule: 'fixtures',
      endpoint: null,
      title: `Seeding ${failure.method.toUpperCase()} ${failure.path}`,
      method: failure.method,
      path: failure.path,
      outcome: 'fail',
      status: failure.status,
      durationMs: 0,
      tags: ['fixtures'],
      failures: [{
        label: 'seed-request-failed',
        severity: failure.status >= 500 ? 'critical' : 'high',
        why: 'A request the suite makes to build its own fixtures was refused. Everything downstream of that record is either skipped or tested against a gap.',
        detail: { status: failure.status, body: JSON.stringify(failure.body).slice(0, 300) },
      }],
    });
  }

  const durationMs = Date.now() - t0;
  const summary = reportLib.summarise(results);
  const dir = reportDir || path.join(QA_DIR, 'reports');
  fs.mkdirSync(dir, { recursive: true });

  const meta = {
    startedAt,
    durationMs,
    endpointCount: ENDPOINTS.length,
    blockedCalls: blockedCount(),
    skipped,
    concurrency,
  };

  const jsonFile = reportLib.writeJson(dir, { meta, summary, results });
  const mdFile = reportLib.writeMarkdown(dir, summary, meta);
  const htmlFile = reportLib.writeHtml(dir, summary, meta);

  await dropQaDatabase();

  return { summary, meta, files: { json: jsonFile, markdown: mdFile, html: htmlFile } };
}

// Allow `node matrix/index.js` on its own, as well as being driven by run-all.
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('matrix/index.js')) {
  const concurrency = Number(process.env.QA_CONCURRENCY || 6);
  runMatrix({ concurrency })
    .then(({ summary, files }) => {
      log('');
      log(`  ${summary.total.toLocaleString()} cases, ${summary.failed.toLocaleString()} failing, ${summary.findings.length} distinct findings`);
      log(`  Report: ${files.html}`);
      process.exit(summary.bySeverity.critical > 0 ? 1 : 0);
    })
    .catch(async (err) => {
      process.stderr.write(`${err.stack}\n`);
      await dropQaDatabase().catch(() => {});
      process.exit(2);
    });
}
