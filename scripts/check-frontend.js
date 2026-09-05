#!/usr/bin/env node
/**
 * Static checks for the React app that a bundler will not do for you.
 *
 * `vite build` happily ships a component that references an identifier which
 * does not exist - it is only a ReferenceError once the browser renders that
 * branch. That is how a missing `X` import shipped and crashed the chat page
 * with a green build behind it. These checks are cheap and run in CI.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'frontend', 'src');

const c = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', 'build'].includes(entry.name)) walk(p, out);
    } else if (/\.jsx?$/.test(entry.name)) {
      out.push(p);
    }
  }
  return out;
}

/**
 * Names a file can legitimately use in JSX: imports, local declarations,
 * object properties (`Icon: Home`), and destructured props (`{ icon: Icon }`).
 */
function knownNames(src) {
  const known = new Set(['React', 'Fragment']);

  for (const m of src.matchAll(/import\s+(?:([A-Za-z0-9_$]+)\s*,?\s*)?(?:\{([^}]*)\})?\s*from/g)) {
    if (m[1]) known.add(m[1].trim());
    if (m[2]) {
      for (const part of m[2].split(',')) {
        const name = part.trim().split(/\s+as\s+/).pop().trim();
        if (name) known.add(name);
      }
    }
  }
  for (const m of src.matchAll(/(?:function|const|let|var|class)\s+([A-Z][A-Za-z0-9_$]*)/g)) known.add(m[1]);
  // `{ icon: Icon }` in a parameter list, and `Icon: Home` in an object.
  for (const m of src.matchAll(/:\s*([A-Z][A-Za-z0-9_$]*)/g)) known.add(m[1]);
  for (const m of src.matchAll(/([A-Z][A-Za-z0-9_$]*)\s*[,}]/g)) known.add(m[1]);

  return known;
}

const problems = [];
const warnings = [];
const files = fs.existsSync(SRC) ? walk(SRC) : [];

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file);
  const known = knownNames(src);

  const used = [...new Set([...src.matchAll(/<([A-Z][A-Za-z0-9_$]*)/g)].map((m) => m[1]))];
  const undefinedNames = used.filter((n) => !known.has(n));
  if (undefinedNames.length) {
    problems.push(`${rel}: <${undefinedNames.join('>, <')}> is used but never imported or defined`);
  }

  // A blocking alert() in a product UI is a smell rather than a break.
  const alerts = (src.match(/\balert\(/g) || []).length;
  if (alerts) warnings.push(`${rel}: ${alerts} blocking alert() call(s) — prefer the toast hook`);

  // setInterval without a matching clear leaks a timer per mount.
  const intervals = (src.match(/setInterval\(/g) || []).length;
  const clears = (src.match(/clearInterval\(/g) || []).length;
  if (intervals > clears) {
    warnings.push(`${rel}: ${intervals} setInterval vs ${clears} clearInterval — a timer may outlive the component`);
  }

  // Object URLs must be released by hand.
  const created = (src.match(/createObjectURL\(/g) || []).length;
  const revoked = (src.match(/revokeObjectURL\(/g) || []).length;
  if (created > revoked) {
    warnings.push(`${rel}: createObjectURL without a matching revokeObjectURL — blob leak`);
  }
}

console.log(c.bold(`\nFrontend checks  ${c.dim(`(${files.length} files)`)}\n`));

for (const p of problems) console.log(`  ${c.red('✗')} ${p}`);
for (const w of warnings) console.log(`  ${c.yellow('!')} ${w}`);

if (!problems.length && !warnings.length) console.log(`  ${c.green('OK')}  nothing to report`);

if (problems.length) {
  console.log(c.red(`\n${problems.length} undefined component reference(s) — these crash at runtime, not at build.\n`));
  process.exit(1);
}
console.log(c.dim('\nNo runtime-breaking references found.\n'));
