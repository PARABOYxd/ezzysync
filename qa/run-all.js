/**
 * One command, every stage.
 *
 * `npm run qa:all` from this directory. It checks the machine can run a QA
 * pass at all, runs the existing backend suite, runs the generated matrix,
 * and writes a single combined report - so "is the app healthy" is one
 * command and one page rather than four tools and a memory of which ones
 * matter.
 *
 * The stages are ordered by how quickly they tell you something useful.
 * Preflight fails in a second when Postgres is down, which is the most common
 * reason a run goes wrong and the least interesting to debug through a stack
 * trace. The backend suite is the fast, precise one - 185 hand-written tests
 * over the parts of the app someone already thought hard about. The matrix is
 * the slow, broad one, and it runs last because a failure there is rarely
 * worth reading while a hand-written test is already red.
 *
 * Flags:
 *   --skip-vitest     just the matrix
 *   --skip-matrix     just the backend suite
 *   --concurrency=N   parallel requests in the matrix stage (default 8)
 *   --open            open the HTML report when the run finishes
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const QA_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(QA_DIR, '..');
const BACKEND = path.join(ROOT, 'backend');
const REPORTS = path.join(QA_DIR, 'reports');

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueOf = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : fallback;
};

const out = (s = '') => process.stdout.write(`${s}\n`);
const rule = () => out('-'.repeat(72));

function heading(n, total, title) {
  out('');
  rule();
  out(`  Stage ${n}/${total}  ${title}`);
  rule();
}

function runCommand(command, commandArgs, cwd) {
  return new Promise((resolve) => {
    const child = spawn(command, commandArgs, {
      cwd,
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let captured = '';
    child.stdout.on('data', (d) => { const s = d.toString(); captured += s; process.stdout.write(s); });
    child.stderr.on('data', (d) => { const s = d.toString(); captured += s; process.stderr.write(s); });
    child.on('close', (code) => resolve({ code, output: captured }));
    child.on('error', (err) => resolve({ code: -1, output: String(err.message) }));
  });
}

/**
 * Everything the run needs, checked before anything slow starts.
 *
 * A missing Postgres is the usual cause of a failed run, and finding that out
 * from a connection-refused stack trace ninety seconds in is a poor use of
 * anyone's afternoon.
 */
async function preflight() {
  const checks = [];

  const nodeMajor = Number(process.versions.node.split('.')[0]);
  checks.push({ name: 'Node 18 or newer', ok: nodeMajor >= 18, detail: `found v${process.versions.node}` });

  const backendModules = fs.existsSync(path.join(BACKEND, 'node_modules'));
  checks.push({ name: 'backend dependencies installed', ok: backendModules, detail: backendModules ? 'node_modules present' : 'run npm install in backend/' });

  const envFile = fs.existsSync(path.join(BACKEND, '.env'));
  checks.push({ name: 'backend/.env present', ok: envFile, detail: envFile ? 'found' : 'copy .env.example to .env' });

  let dbOk = false;
  let dbDetail = 'not attempted';
  if (backendModules) {
    try {
      const { createRequire } = await import('node:module');
      const req = createRequire(path.join(BACKEND, 'qa-preflight.js'));
      req('dotenv').config({ path: path.join(BACKEND, '.env') });
      const { Client } = req('pg');
      const url = new URL(process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres');
      url.pathname = '/postgres';
      const client = new Client({ connectionString: url.toString() });
      await client.connect();
      const { rows } = await client.query('SELECT version()');
      await client.end();
      dbOk = true;
      dbDetail = String(rows[0].version).split(',')[0];
    } catch (err) {
      dbDetail = err.message;
    }
  }
  checks.push({ name: 'Postgres reachable', ok: dbOk, detail: dbDetail });

  for (const c of checks) {
    out(`  ${c.ok ? '[ ok ]' : '[fail]'}  ${c.name.padEnd(32)} ${c.detail}`);
  }

  return checks.every((c) => c.ok);
}

function parseVitest(output) {
  const tests = output.match(/Tests\s+(.+)/)?.[1]?.trim() || null;
  const files = output.match(/Test Files\s+(.+)/)?.[1]?.trim() || null;
  const failed = /(\d+) failed/.exec(tests || '');
  return { tests, files, failedCount: failed ? Number(failed[1]) : 0 };
}

async function main() {
  const started = Date.now();
  const stages = [];
  const total = 3;

  out('');
  out('  EzzySync QA - full pass');
  out(`  ${new Date().toISOString()}`);

  heading(1, total, 'Preflight');
  const ready = await preflight();
  stages.push({ name: 'preflight', ok: ready });
  if (!ready) {
    out('');
    out('  Preflight failed. Nothing else ran - fix the items marked [fail] above.');
    process.exit(2);
  }

  let vitest = null;
  if (!has('--skip-vitest')) {
    heading(2, total, 'Backend suite (vitest, real Postgres)');
    const res = await runCommand('npx', ['vitest', 'run'], BACKEND);
    vitest = parseVitest(res.output);
    stages.push({ name: 'backend suite', ok: res.code === 0, detail: vitest.tests });
  } else {
    stages.push({ name: 'backend suite', ok: true, detail: 'skipped' });
  }

  let matrix = null;
  if (!has('--skip-matrix')) {
    heading(3, total, 'Generated matrix (rule-driven API cases)');
    const { runMatrix } = await import('./matrix/index.js');
    const result = await runMatrix({ concurrency: Number(valueOf('--concurrency', 8)) });
    matrix = result;
    stages.push({
      name: 'matrix',
      ok: (result.summary.bySeverity.critical || 0) === 0,
      detail: `${result.summary.total.toLocaleString()} cases, ${result.summary.findings.length} findings`,
    });
  } else {
    stages.push({ name: 'matrix', ok: true, detail: 'skipped' });
  }

  const durationMs = Date.now() - started;

  out('');
  rule();
  out('  Summary');
  rule();
  for (const s of stages) {
    out(`  ${s.ok ? '[ ok ]' : '[fail]'}  ${s.name.padEnd(16)} ${s.detail || ''}`);
  }

  if (matrix) {
    const sev = matrix.summary.bySeverity;
    out('');
    out(`  Cases run        ${matrix.summary.total.toLocaleString()}`);
    out(`  Failing cases    ${matrix.summary.failed.toLocaleString()}`);
    out(`  Findings         ${matrix.summary.findings.length} distinct`);
    out(`    critical       ${sev.critical || 0}`);
    out(`    high           ${sev.high || 0}`);
    out(`    medium         ${sev.medium || 0}`);
    out(`    low            ${sev.low || 0}`);
    out('');
    out('  Top findings:');
    for (const f of matrix.summary.findings.slice(0, 8)) {
      out(`    ${f.severity.padEnd(9)} ${(f.endpoint || f.rule).padEnd(28)} ${f.check} (x${f.occurrences})`);
    }
  }

  // One combined artefact, so a run is a single file to send to somebody.
  fs.mkdirSync(REPORTS, { recursive: true });
  const combined = {
    startedAt: new Date(started).toISOString(),
    durationMs,
    stages,
    vitest,
    matrix: matrix ? { meta: matrix.meta, summary: { ...matrix.summary, findings: matrix.summary.findings } } : null,
  };
  fs.writeFileSync(path.join(REPORTS, 'qa-run.json'), JSON.stringify(combined, null, 2), 'utf8');

  out('');
  out(`  Finished in ${(durationMs / 1000).toFixed(1)}s`);
  if (matrix) out(`  Report: ${matrix.files.html}`);
  out(`  Combined: ${path.join(REPORTS, 'qa-run.json')}`);
  out('');

  if (has('--open') && matrix) {
    spawn(process.platform === 'win32' ? 'cmd' : 'open',
      process.platform === 'win32' ? ['/c', 'start', '', matrix.files.html] : [matrix.files.html],
      { detached: true, stdio: 'ignore' }).unref();
  }

  // A critical finding or a red backend test fails the run; everything else
  // is reported without blocking, because a suite that exits non-zero on a
  // medium-severity observation is a suite people start ignoring.
  const failed = stages.some((s) => !s.ok);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  process.stderr.write(`${err.stack}\n`);
  process.exit(2);
});
