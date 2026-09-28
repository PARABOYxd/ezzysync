import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

/**
 * No module may be handed a half-built copy of another.
 *
 * With CommonJS, when A requires B while B is still loading (a cycle), A gets
 * B's exports as they are at that moment. If B then replaces module.exports
 * wholesale, A keeps the empty original forever. That is how every booking
 * confirmation and trip reminder silently stopped sending: bookingService
 * held `{}` for whatsappSendService and called `.findOrStartChat` on it.
 *
 * This loads the app in server.js's order - in a separate process, so the
 * order is the real one and not whatever this test file imported first - and
 * reports any module that was required mid-load and then replaced its
 * exports.
 */
const DETECT = `
const Module = require('module'); const path = require('path'); const fs = require('fs');
const load = Module._load; const hits = new Set();
Module._load = function (request, parent) {
  let resolved; try { resolved = Module._resolveFilename(request, parent); } catch { resolved = request; }
  const cached = require.cache[resolved];
  if (cached && !cached.loaded && !resolved.includes('node_modules') && /^module\\.exports\\s*=/m.test(fs.readFileSync(resolved, 'utf8'))) {
    hits.add(path.relative(process.cwd(), resolved) + ' (half-built copy given to ' + path.relative(process.cwd(), parent.filename) + ')');
  }
  return load.apply(this, arguments);
};
process.env.LOG_LEVEL = 'silent';
for (const m of fs.readFileSync('server.js', 'utf8').matchAll(/require\\('(\\.\\/[^']+)'\\)/g)) {
  try { require(path.resolve(m[1])); } catch { /* a module that cannot load is another test's problem */ }
}
process.stdout.write(JSON.stringify([...hits]));
process.exit(0);
`;

describe('module loading', () => {
  it('no module keeps a half-built copy of another through a require cycle', () => {
    const backendDir = path.resolve(import.meta.dirname, '..');
    const out = spawnSync(process.execPath, ['-e', DETECT], {
      cwd: backendDir,
      encoding: 'utf8',
      env: { ...process.env, NODE_ENV: 'test' },
      timeout: 60_000,
    });
    const json = (out.stdout || '').trim().split('\n').pop();
    expect(JSON.parse(json || '[]')).toEqual([]);
    // Loads every module in a child process: ~10s alone, several times that on
    // a busy machine. The suite's 20s default failed it under load with nothing
    // wrong - the child's own 60s limit above is the real bound.
  }, 90_000);
});
