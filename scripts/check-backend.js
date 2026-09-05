#!/usr/bin/env node
/**
 * Requires every backend module, without starting a server.
 *
 * `node --check server.js` only parses one file, so it never noticed a missing
 * dependency, a require pointing at a file that no longer exists, or a syntax
 * error anywhere else in the tree - all of which crash on boot. Loading every
 * module is what actually proves the process can start.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'backend');
const DIRS = ['config', 'controllers', 'middleware', 'repositories', 'routes', 'services', 'utils', 'validators', 'jobs', 'models'];

const c = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

// Loading config/env.js reads these; give them harmless values so the check
// works on a machine with no .env at all (a fresh CI runner, for instance).
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/placeholder';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'check-only-secret-value-long-enough-0000000000';
// A syntactically valid aes-256 key, so utils/encryption loads. It is never
// used to encrypt anything - this check only proves the modules import.
process.env.TOKEN_ENCRYPTION_KEY =
  process.env.TOKEN_ENCRYPTION_KEY || '0'.repeat(64);

const failures = [];
let loaded = 0;

for (const dir of DIRS) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) continue;

  for (const file of fs.readdirSync(full).filter((f) => f.endsWith('.js'))) {
    const rel = `backend/${dir}/${file}`;
    try {
      require(path.join(full, file));
      loaded += 1;
    } catch (err) {
      failures.push(`${rel}\n      ${err.message.split('\n')[0]}`);
    }
  }
}

console.log(c.bold(`\nBackend module check  ${c.dim(`(${loaded} modules loaded)`)}\n`));

if (failures.length) {
  for (const f of failures) console.log(`  ${c.red('✗')} ${f}`);
  console.log(c.red(`\n${failures.length} module(s) failed to load — the server would not boot.\n`));
  process.exit(1);
}

console.log(`  ${c.green('OK')}  every module loads\n`);
