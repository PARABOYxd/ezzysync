/**
 * Does this suite still test the app that exists?
 *
 * Two ways for that to quietly stop being true. The harness assembles its own
 * Express app because server.js cannot be imported, so a router mounted there
 * and not here would never be tested - and nothing would say so, because a
 * route that is never called never fails. And the inventory is hand-written,
 * so a new endpoint added to a router gets no cases until someone adds it.
 *
 * Both are checked by reading the source rather than by calling anything:
 * server.js for its mount table, every file in routes/ for its declarations,
 * compared against the harness mount list and the inventory. An uncovered
 * route is reported as a gap in the QA suite, which is a different kind of
 * finding from a bug in the app - and the one that decides whether the rest
 * of this report can be trusted.
 */
import fs from 'node:fs';
import path from 'node:path';
import { makeScriptCase } from '../lib/case.js';
import { SEVERITY } from '../lib/expect.js';
import { BACKEND_DIR } from '../lib/require.js';
import { MOUNTED_PREFIXES } from '../lib/app.js';
import { ENDPOINTS } from '../lib/inventory.js';

export const name = 'coverage-parity';
export const description = 'The harness app, the inventory and the real routers, checked against each other.';

function readServerMounts() {
  const src = fs.readFileSync(path.join(BACKEND_DIR, 'server.js'), 'utf8');

  const requires = new Map();
  for (const m of src.matchAll(/const\s+(\w+)\s*=\s*require\(\s*['"]\.\/routes\/([\w.]+)['"]\s*\)/g)) {
    requires.set(m[1], m[2].replace(/\.js$/, ''));
  }

  const mounts = [];
  for (const m of src.matchAll(/app\.use\(\s*["']([^"']+)["']\s*,([^)]*)\)/g)) {
    const prefix = m[1];
    if (!prefix.startsWith('/api')) continue;
    const identifiers = m[2].match(/\w+/g) || [];
    const routerName = identifiers.find((id) => requires.has(id));
    mounts.push({ prefix, router: routerName ? requires.get(routerName) : null });
  }
  return mounts;
}

function readRouterEndpoints(routerFile, prefix) {
  const file = path.join(BACKEND_DIR, 'routes', `${routerFile}.js`);
  if (!fs.existsSync(file)) return [];
  const src = fs.readFileSync(file, 'utf8');
  const out = [];
  for (const m of src.matchAll(/router\.(get|post|put|patch|delete)\(\s*['"]([^'"]*)['"]/g)) {
    const sub = m[2] === '/' ? '' : m[2];
    out.push({ method: m[1], path: `${prefix}${sub}` || '/' });
  }
  return out;
}

const normalise = (p) => p.replace(/:[A-Za-z0-9_]+/g, ':param').replace(/\/$/, '');

export function generate() {
  const cases = [];

  cases.push(makeScriptCase({
    rule: name,
    title: 'The harness mounts every router server.js mounts',
    tags: ['coverage', 'meta'],
    run: async ({ assert }) => {
      const mounts = readServerMounts();
      // `app.use('/api', apiLimiter)` is a middleware, not a router mount;
      // only entries that resolve to a file in routes/ are mount points.
      const serverPrefixes = [...new Set(mounts.filter((m) => m.router).map((m) => m.prefix))];
      const missing = serverPrefixes.filter((p) => !MOUNTED_PREFIXES.includes(p));
      const extra = MOUNTED_PREFIXES.filter((p) => !serverPrefixes.includes(p));

      assert('no-unmounted-router', missing.length === 0, SEVERITY.critical,
        'server.js mounts a router the QA harness does not, so every route under it is untested and this report\'s coverage figure is wrong.',
        { missing });
      assert('no-phantom-mount', extra.length === 0, SEVERITY.medium,
        'The harness mounts a prefix server.js no longer does, so cases are being run against routes that do not exist in production.',
        { extra });
    },
  }));

  cases.push(makeScriptCase({
    rule: name,
    title: 'Every route declared in routes/ appears in the inventory',
    tags: ['coverage', 'meta'],
    run: async ({ assert }) => {
      const mounts = readServerMounts();
      const declared = [];
      for (const { prefix, router } of mounts) {
        if (!router) continue;
        declared.push(...readRouterEndpoints(router, prefix));
      }

      const known = new Set(ENDPOINTS.map((e) => `${e.method} ${normalise(e.path)}`));
      const uncovered = declared.filter((d) => !known.has(`${d.method} ${normalise(d.path)}`));

      // Deduplicate: two routers mounted under overlapping prefixes can
      // declare the same path.
      const unique = [...new Map(uncovered.map((u) => [`${u.method} ${u.path}`, u])).values()];

      assert('inventory-covers-every-route', unique.length === 0, SEVERITY.high,
        'The app declares routes the inventory does not list. Those routes receive no authentication, permission, isolation or validation cases at all - they are simply absent from this run.',
        { uncovered: unique.map((u) => `${u.method.toUpperCase()} ${u.path}`) });

      assert('coverage-counted', true, SEVERITY.info,
        'Route coverage for this run.',
        { declaredRoutes: declared.length, inventoried: ENDPOINTS.length, uncovered: unique.length });
    },
  }));

  cases.push(makeScriptCase({
    rule: name,
    title: 'Permissions named by routers all exist in the permission matrix',
    tags: ['coverage', 'rbac', 'meta'],
    run: async ({ assert }) => {
      const { MODULES } = (await import('../lib/require.js')).backendRequire('./config/permissions');
      const routesDir = path.join(BACKEND_DIR, 'routes');
      const unknown = [];

      for (const file of fs.readdirSync(routesDir)) {
        const src = fs.readFileSync(path.join(routesDir, file), 'utf8');
        for (const m of src.matchAll(/requirePermission\(\s*['"](\w+)['"]\s*,\s*['"](\w+)['"]\s*\)/g)) {
          const [, mod, action] = m;
          if (!MODULES[mod] || !MODULES[mod].includes(action)) {
            unknown.push({ file, permission: `${mod}.${action}` });
          }
        }
      }

      assert('no-ungrantable-permission', unknown.length === 0, SEVERITY.high,
        'A router gates on a module/action pair that config/permissions does not define. Because normalizePermissions only ever writes known actions, that gate can never be satisfied - an admin passes it by role and every team member is refused, whatever the Team screen shows their permissions to be.',
        { unknown });
    },
  }));

  return { cases, skipped: [] };
}
