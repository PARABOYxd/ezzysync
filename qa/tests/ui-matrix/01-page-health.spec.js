/**
 * Every page, as every kind of user, on a laptop and on a phone.
 *
 * 20 app routes x 3 roles x 2 screen sizes, plus the public pages signed out.
 * Each visit asks the same questions: did it render, did anything throw, did
 * any API call 500, did the user land where their permissions say they should,
 * does the layout fit a phone, and can a screen reader name what is on it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, contextFor, ROLES, VIEWPORTS } from './lib/world.js';
import { APP_ROUTES, PUBLIC_ROUTES, resolveRoute } from './lib/inventory.js';
import { attachMonitor, settle, horizontalOverflow } from './lib/monitor.js';
import { useCases, assertHealthy } from './lib/uc.js';
import { API_URL } from '../support/fixtures.js';

const here = path.dirname(fileURLToPath(import.meta.url));

test.describe.configure({ mode: 'parallel' });

async function a11yChecks(page, uc, where) {
  // One use case per element: each unnamed control is a separate thing to fix.
  const controls = await page.evaluate(() => {
    const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const nameOf = (el) => (el.getAttribute('aria-label') || el.getAttribute('title') || el.innerText || el.value || '').trim();
    const labelled = (el) => {
      if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title')) return true;
      if (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) return true;
      if (el.closest('label')) return true;
      return !!el.getAttribute('placeholder');
    };
    const out = [];
    document.querySelectorAll('button, [role="button"], a[href]').forEach((el, i) => {
      if (!visible(el)) return;
      out.push({ kind: el.tagName === 'A' ? 'link' : 'button', i, ok: nameOf(el).length > 0, desc: el.outerHTML.slice(0, 90) });
    });
    document.querySelectorAll('input:not([type=hidden]), select, textarea').forEach((el, i) => {
      if (!visible(el)) return;
      out.push({ kind: 'field', i, ok: labelled(el), desc: el.outerHTML.slice(0, 90) });
    });
    document.querySelectorAll('img').forEach((el, i) => {
      if (!visible(el)) return;
      out.push({ kind: 'image', i, ok: el.hasAttribute('alt'), desc: (el.getAttribute('src') || '').slice(0, 60) });
    });
    return out;
  }).catch(() => []);

  for (const c of controls) {
    const need = { button: 'an accessible name', link: 'an accessible name', field: 'a label', image: 'alt text' }[c.kind];
    await uc(`${where}: ${c.kind} #${c.i} has ${need}`, async () => {
      expect(c.ok, `${c.kind} without ${need}: ${c.desc}`).toBe(true);
    }, { level: 'warn' });
  }
}

for (const route of APP_ROUTES) {
  for (const role of ROLES) {
    for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
      test(`${route.name} · ${role} · ${vpName}`, async ({ browser, world, baseURL }) => {
        test.setTimeout(90_000);
        const target = resolveRoute(route, world.data);
        test.skip(!target, `no seeded record for ${route.path}`);

        const { uc, finish } = useCases();
        const context = await contextFor(browser, world, role, viewport, baseURL);
        const page = await context.newPage();
        const monitor = attachMonitor(page, API_URL);
        const where = `${route.name} (${role}, ${vpName})`;

        const started = Date.now();
        await page.goto(target);
        await settle(page, 600);
        const loadMs = Date.now() - started;

        await uc(`${where}: renders without a JS error, API 5xx or blank screen`, () => assertHealthy(page, monitor));

        const deniedByPermission = route.module && role === 'restricted';
        await uc(`${where}: lands where the user's permissions say`, async () => {
          const pathname = new URL(page.url()).pathname;
          expect(pathname, 'a signed-in user was sent to the login page').not.toBe('/login');
          if (deniedByPermission) {
            expect(pathname, `a user without ${route.module} reached ${route.path}`).toBe('/dashboard');
          } else if (route.adminOnly && role !== 'admin') {
            expect(pathname, `a ${role} reached the admin-only ${route.path}`).not.toBe(route.path);
          } else {
            expect(pathname, `redirected away from ${route.path}`).toBe(new URL(target, baseURL).pathname);
          }
        });

        await uc(`${where}: loads in under 8 seconds`, async () => {
          expect(loadMs, `took ${loadMs}ms`).toBeLessThan(8000);
        }, { level: 'warn' });

        await uc(`${where}: no console errors`, async () => {
          // The text, not just the count: "console errors" in a report tells
          // the reader nothing they can act on.
          const errors = monitor.newConsoleErrors();
          if (errors.length) throw new Error(`console error: ${errors.join(' | ').slice(0, 300)}`);
        }, { level: 'warn' });

        if (vpName === 'mobile') {
          await uc(`${where}: fits a phone screen (no sideways scroll)`, async () => {
            const overflow = await horizontalOverflow(page);
            expect(overflow, `page is ${overflow}px wider than the screen`).toBeLessThanOrEqual(8);
          }, { level: 'warn' });
        }

        await uc(`${where}: survives a hard refresh`, async () => {
          monitor.mark();
          await page.reload();
          await settle(page, 400);
          await assertHealthy(page, monitor);
        });

        // Accessibility once per route and role - it does not change with
        // the viewport enough to be worth counting twice.
        if (vpName === 'desktop') await a11yChecks(page, uc, where);

        await context.close();
        finish();
      });
    }
  }
}

for (const route of PUBLIC_ROUTES) {
  for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
    test(`${route.name} (signed out) · ${vpName}`, async ({ browser, world, baseURL }) => {
      const target = resolveRoute(route, world.data);
      test.skip(!target, `no seeded record for ${route.path}`);

      const { uc, finish } = useCases();
      const context = await contextFor(browser, world, 'anon', viewport, baseURL);
      const page = await context.newPage();
      const monitor = attachMonitor(page, API_URL);
      const where = `${route.name} (signed out, ${vpName})`;

      await page.goto(target);
      await settle(page, 500);

      await uc(`${where}: renders without a JS error, API 5xx or blank screen`, () => assertHealthy(page, monitor));
      await uc(`${where}: stays on the public page`, async () => {
        expect(new URL(page.url()).pathname).toBe(new URL(target, baseURL).pathname);
      });
      await uc(`${where}: no console errors`, async () => {
        const errors = monitor.newConsoleErrors();
        if (errors.length) throw new Error(`console error: ${errors.join(' | ').slice(0, 300)}`);
      }, { level: 'warn' });
      if (vpName === 'mobile') {
        await uc(`${where}: fits a phone screen`, async () => {
          expect(await horizontalOverflow(page)).toBeLessThanOrEqual(8);
        }, { level: 'warn' });
      } else {
        await a11yChecks(page, uc, where);
      }

      await context.close();
      finish();
    });
  }
}

test('every route in App.jsx is in the UI inventory', async () => {
  const app = fs.readFileSync(path.resolve(here, '../../../frontend/src/App.jsx'), 'utf8');
  const declared = [...app.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]).filter((p) => p !== '*' && p !== '/' && !p.startsWith('/auth/'));
  const known = new Set([...APP_ROUTES, ...PUBLIC_ROUTES].map((r) => r.path));
  expect(declared.filter((p) => !known.has(p)), 'routes with no UI-matrix coverage').toEqual([]);
});
