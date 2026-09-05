#!/usr/bin/env node
/**
 * One command to make a fresh clone runnable: install every workspace and
 * create the .env files from the schema, generating real secrets rather than
 * leaving placeholders for someone to notice later.
 *
 * Safe to re-run. Existing .env files are never overwritten - missing keys are
 * appended to them instead, so adding a new variable to env-schema.js and
 * re-running is all it takes to pick it up.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { BACKEND_ENV, FRONTEND_ENV } = require('./env-schema');

const ROOT = path.join(__dirname, '..');
const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

const secret = () => crypto.randomBytes(32).toString('hex');

/** Values worth generating rather than leaving for a human to fill in. */
function defaultFor(item) {
  if (item.key === 'JWT_SECRET' || item.key === 'OTP_SECRET') return secret();
  if (item.key === 'TOKEN_ENCRYPTION_KEY') return secret();
  return item.example ?? '';
}

function renderExample(schema) {
  const lines = ['# Generated from scripts/env-schema.js - edit that file, then run "npm run setup".', ''];
  for (const item of schema) {
    if (item.note) lines.push(`# ${item.note}`);
    const tag = item.level === 'required' ? ' (required)' : item.level === 'production' ? ' (required in production)' : '';
    if (tag) lines.push(`#${tag.toUpperCase()}`);
    lines.push(`${item.key}=${item.example ?? ''}`);
    lines.push('');
  }
  return lines.join('\n');
}

function ensureEnv(dir, schema, label) {
  const envPath = path.join(ROOT, dir, '.env');
  const examplePath = path.join(ROOT, dir, '.env.example');

  fs.writeFileSync(examplePath, renderExample(schema));
  console.log(`${c.green('✓')} ${label}/.env.example regenerated from the schema`);

  if (!fs.existsSync(envPath)) {
    const body = schema.map((i) => `${i.key}=${defaultFor(i)}`).join('\n') + '\n';
    fs.writeFileSync(envPath, body);
    console.log(`${c.green('✓')} ${label}/.env created with generated secrets`);
    return;
  }

  // Append only what is genuinely absent; never touch a value already set.
  const existing = fs.readFileSync(envPath, 'utf8');
  const have = new Set([...existing.matchAll(/^\s*([A-Z0-9_]+)\s*=/gm)].map((m) => m[1]));
  const missing = schema.filter((i) => !have.has(i.key));

  if (!missing.length) {
    console.log(`${c.green('✓')} ${label}/.env already has every key`);
    return;
  }

  const add = ['', '# --- added by npm run setup ---', ...missing.map((i) => `${i.key}=${defaultFor(i)}`), ''].join('\n');
  fs.appendFileSync(envPath, add);
  console.log(`${c.yellow('+')} ${label}/.env gained ${missing.length} missing key(s): ${missing.map((i) => i.key).join(', ')}`);
}

console.log(c.bold('\nEzzySync setup\n'));

for (const [dir, label] of [['backend', 'backend'], ['frontend', 'frontend'], ['landing', 'landing']]) {
  const pkg = path.join(ROOT, dir, 'package.json');
  if (!fs.existsSync(pkg)) continue;
  process.stdout.write(c.dim(`  installing ${label}… `));
  execSync('npm install', { cwd: path.join(ROOT, dir), stdio: 'pipe' });
  console.log(c.green('done'));
}

console.log('');
ensureEnv('backend', BACKEND_ENV, 'backend');
ensureEnv('frontend', FRONTEND_ENV, 'frontend');

console.log(c.bold('\nNext:'));
console.log('  npm run dev     ' + c.dim('backend + frontend together'));
console.log('  npm run check   ' + c.dim('env + tests + build, the same checks CI runs'));
console.log('');
console.log(c.dim('  DATABASE_URL still needs a real Postgres connection string.\n'));
