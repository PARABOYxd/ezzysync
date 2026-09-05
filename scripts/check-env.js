#!/usr/bin/env node
/**
 * Checks the environment files and says exactly what is wrong.
 *
 * Run on its own (`npm run test:env`), as part of `npm run check`, and in CI.
 * The point is that nobody should have to open a .env file and compare it by
 * eye against the code to find out why something is not working.
 *
 * Exit code 1 only for problems that genuinely stop the app: a missing
 * required variable, or a production-only gap when checking with --prod.
 */
const fs = require('fs');
const path = require('path');
const { BACKEND_ENV, FRONTEND_ENV } = require('./env-schema');

const ROOT = path.join(__dirname, '..');
const PROD = process.argv.includes('--prod');

const c = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

/** Reads a .env into a plain object. Values are not expanded or trimmed of quotes. */
function readEnvFile(file) {
  if (!fs.existsSync(file)) return null;
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=(.*)$/.exec(line);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

function checkOne(label, envFile, schema) {
  const problems = [];
  const warnings = [];
  const values = readEnvFile(envFile);

  if (!values) {
    problems.push(`${envFile} does not exist. Run "npm run setup" to create it from the example.`);
    return { label, problems, warnings, values: {} };
  }

  for (const item of schema) {
    const raw = values[item.key];
    const set = raw !== undefined && raw !== '';

    if (!set) {
      const msg = `${item.key} is not set${item.note ? ` — ${item.note}` : ''}`;
      if (item.level === 'required') problems.push(msg);
      else if (item.level === 'production') (PROD ? problems : warnings).push(msg);
      continue;
    }

    if (item.minLength && raw.length < item.minLength) {
      const msg = `${item.key} is only ${raw.length} characters — use at least ${item.minLength}`;
      (item.level === 'required' || PROD ? problems : warnings).push(msg);
    }

    if (PROD && /change-me|localhost|rzp_test|your-|xxxx|mock/i.test(raw)) {
      warnings.push(`${item.key} still looks like a placeholder or a local value: ${raw.slice(0, 40)}`);
    }
  }

  // Anything in the file the code never reads is usually a typo in the key.
  const known = new Set(schema.map((s) => s.key));
  for (const key of Object.keys(values)) {
    if (!known.has(key)) warnings.push(`${key} is set but nothing reads it — check the spelling`);
  }

  return { label, problems, warnings, values };
}

const results = [
  checkOne('backend', path.join(ROOT, 'backend', '.env'), BACKEND_ENV),
  checkOne('frontend', path.join(ROOT, 'frontend', '.env'), FRONTEND_ENV),
];

console.log(c.bold(`\nEnvironment check${PROD ? ' (production rules)' : ''}\n`));

let failed = false;
for (const r of results) {
  if (!r.problems.length && !r.warnings.length) {
    console.log(`${c.green('OK')}  ${r.label}`);
    continue;
  }
  console.log(c.bold(`${r.label}`));
  for (const p of r.problems) {
    failed = true;
    console.log(`  ${c.red('✗')} ${p}`);
  }
  for (const w of r.warnings) console.log(`  ${c.yellow('!')} ${w}`);
  console.log('');
}

if (failed) {
  console.log(c.red('\nEnvironment is not usable. Fix the ✗ items above.\n'));
  process.exit(1);
}
console.log(c.dim(PROD ? '\nReady for production.\n' : '\nReady for development. Run with --prod to apply production rules.\n'));
