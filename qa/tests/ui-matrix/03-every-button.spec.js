/**
 * Every button, tab, link and dropdown option on every page.
 *
 * Nothing here knows what any button is for. The walk finds everything
 * clickable in the page content (main) and the top bar, presses each one in
 * turn from a clean state, and after every press asks the monitor whether
 * anything broke: a JS exception, a 500, a white screen, a script alert. If
 * the press opened a drawer or modal, it must close again; if it navigated,
 * the destination must render.
 *
 * Dropdowns (<select>) get every option chosen, one at a time - that is how
 * filter bars break, on the one combination nobody tried.
 *
 * Buttons whose names say they reach outside the test tenant or destroy the
 * data the walk needs are not pressed; see DO_NOT_PRESS in inventory.js.
 * Each one is recorded as skipped in the report, by name.
 *
 * Run for the admin and for the fully-permissioned member, on desktop and on
 * a phone, because the UI shows different controls to each.
 */
import { test, expect, contextFor, VIEWPORTS } from './lib/world.js';
import { APP_ROUTES, resolveRoute, isDangerous } from './lib/inventory.js';
import { attachMonitor, settle, closeOverlays, overlayOpen } from './lib/monitor.js';
import { useCases, assertHealthy } from './lib/uc.js';
import { API_URL } from '../support/fixtures.js';

test.describe.configure({ mode: 'parallel' });

const MAX_CONTROLS_PER_PAGE = Number(process.env.UI_MATRIX_MAX_CONTROLS || 90);
const WALK_ROLES = ['admin', 'member'];

/** What gets typed into search boxes and text filters outside a form. */
const TYPED_INTO_FILTERS = [
  { label: 'a single letter', value: 'a' },
  { label: 'text that matches nothing', value: 'zzqx-no-such-record' },
  { label: 'a phone number', value: '9876543210' },
  { label: 'a script tag', value: '<img src=x onerror=alert("ui-xss")>' },
  { label: 'SQL', value: "' OR '1'='1" },
  { label: 'regex characters', value: '(.*[?' },
  { label: '500 characters', value: 'x'.repeat(500) },
  { label: 'emoji', value: '🧪🚀' },
];

/**
 * Tags every visible, enabled control in the page content with a stable
 * number and returns their names. The same order every time, so a control
 * can be found again after the page re-renders.
 */
async function tagControls(page) {
  return page.evaluate(() => {
    const scope = [...document.querySelectorAll('main, header')];
    const seen = new Set();
    const out = [];
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    for (const root of scope) {
      root.querySelectorAll('button, [role="button"], [role="tab"], a[href], select, input[type="checkbox"], input[type="radio"], input[type="search"], input[type="text"]:not([readonly]), input:not([type]):not([readonly])').forEach((el) => {
        // Fields inside an open form belong to the form rule, not here.
        if (el.closest('[role="dialog"]')) return;
        if (seen.has(el) || !visible(el) || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
        seen.add(el);
        const idx = out.length;
        el.setAttribute('data-uim', String(idx));
        const name = (el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('placeholder') || el.innerText || (el.type === 'text' || el.type === 'search' ? '' : el.value) || el.getAttribute('name') || '').trim().replace(/\s+/g, ' ').slice(0, 60);
        const tag = el.tagName.toLowerCase();
        const kind = tag === 'select' ? 'select' : tag === 'a' ? 'link' : tag === 'input' ? (['checkbox', 'radio'].includes(el.type) ? el.type : 'textbox') : 'button';
        const ordinal = out.filter((o) => o.name === name && o.kind === kind).length;
        out.push({
          idx,
          ordinal,
          name,
          kind,
          href: tag === 'a' ? el.getAttribute('href') : null,
          target: tag === 'a' ? el.getAttribute('target') : null,
          options: tag === 'select' ? [...el.options].map((o) => o.value) : [],
        });
      });
    }
    return out;
  });
}

/**
 * A page as a first-time visitor sees it: remembered UI choices (table vs
 * kanban, dark mode, open tabs) cleared, the session kept. Without this, one
 * "Kanban" press hides every table-row button for the rest of the walk.
 */
async function freshPage(page, target) {
  await page.evaluate(() => {
    try {
      for (const key of Object.keys(localStorage)) {
        if (!/^hf_|^journeyflow_tour/.test(key)) localStorage.removeItem(key);
      }
      sessionStorage.clear();
    } catch { /* storage unavailable */ }
  }).catch(() => {});
  await page.goto(target);
  await settle(page, 400);
}

async function backToStart(page, target, baseURL) {
  await closeOverlays(page);
  const here = new URL(page.url());
  const want = new URL(target, baseURL);
  if (here.pathname !== want.pathname || await overlayOpen(page)) await freshPage(page, target);
}

/**
 * Finds a control again by what it is - its name, kind and which one of that
 * name it was - rather than by position, because a re-render reorders things.
 * If it is not on the page as it stands, the page is reset once and looked at
 * again; only then is the control reported as unreachable.
 */
async function findControl(page, item, target) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controls = await tagControls(page);
    const match = controls.find((c) => c.name === item.name && c.kind === item.kind && c.ordinal === item.ordinal);
    if (match) return page.locator(`[data-uim="${match.idx}"]`).first();
    if (attempt === 0) await freshPage(page, target);
  }
  return null;
}

for (const route of APP_ROUTES) {
  for (const role of WALK_ROLES) {
    for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
      test(`every control · ${route.name} · ${role} · ${vpName}`, async ({ browser, world, baseURL }) => {
        test.setTimeout(15 * 60_000);
        const target = resolveRoute(route, world.data);
        test.skip(!target, `no seeded record for ${route.path}`);

        const { uc, finish } = useCases();
        const context = await contextFor(browser, world, role, viewport, baseURL);
        const page = await context.newPage();
        const monitor = attachMonitor(page, API_URL);
        const where = `${route.name} (${role}, ${vpName})`;
        const skipped = [];
        const unreachable = [];

        await page.goto(target);
        await freshPage(page, target);
        const controls = (await tagControls(page)).slice(0, MAX_CONTROLS_PER_PAGE);

        for (const item of controls) {
          const label = item.name || `${item.kind} #${item.idx}`;

          if (isDangerous(item.name)) {
            skipped.push(label);
            continue;
          }

          if (item.kind === 'link') {
            const external = !item.href || /^(https?:|mailto:|tel:|javascript:)/i.test(item.href) || item.target === '_blank';
            if (external) {
              await uc(`${where}: link "${label}" has a real destination`, async () => {
                expect(item.href, 'link with no href').toBeTruthy();
                expect(item.href, 'javascript: link').not.toMatch(/^javascript:/i);
              });
              continue;
            }
          }

          if (item.kind === 'textbox') {
            for (const v of TYPED_INTO_FILTERS) {
              await backToStart(page, target, baseURL);
              const el = await findControl(page, item, target);
              if (!el) { unreachable.push(label); break; }
              await uc(`${where}: type ${v.label} into "${label}"`, async () => {
                monitor.mark();
                await el.fill(v.value, { timeout: 8000 });
                await el.press('Enter').catch(() => {});
                await settle(page, 450);
                await assertHealthy(page, monitor);
              });
            }
            continue;
          }

          if (item.kind === 'select') {
            for (const option of item.options) {
              await backToStart(page, target, baseURL);
              const el = await findControl(page, item, target);
              // Gone in this state: not a use case that ran, so not counted.
              if (!el) { unreachable.push(label); continue; }
              await uc(`${where}: choose "${option || '(blank)'}" in "${label}"`, async () => {
                monitor.mark();
                await el.selectOption(option, { timeout: 8000 });
                await settle(page, 250);
                await assertHealthy(page, monitor);
              });
            }
            continue;
          }

          let opened = false;
          let moved = false;
          await backToStart(page, target, baseURL);
          const el = await findControl(page, item, target);
          if (!el) { unreachable.push(label); continue; }
          await uc(`${where}: press ${item.kind} "${label}"`, async () => {
            monitor.mark();
            await el.click({ timeout: 8000 });
            await settle(page, 350);
            await assertHealthy(page, monitor);
            opened = await overlayOpen(page);
            moved = new URL(page.url()).pathname !== new URL(target, baseURL).pathname;
          });

          if (opened) {
            await uc(`${where}: the panel opened by "${label}" closes again`, async () => {
              monitor.mark();
              await closeOverlays(page);
              expect(await overlayOpen(page), 'drawer/modal stayed open after Close and Escape').toBe(false);
              await assertHealthy(page, monitor);
            });
          }
          if (moved) {
            await uc(`${where}: "${label}" led to ${new URL(page.url()).pathname}, which renders`, async () => {
              await assertHealthy(page, monitor);
            });
          }
        }

        if (unreachable.length) {
          test.info().annotations.push({ type: 'not reachable from a clean page state', description: [...new Set(unreachable)].join(', ') });
        }
        if (skipped.length) {
          test.info().annotations.push({ type: 'not pressed (outside the tenant or destructive)', description: skipped.join(', ') });
        }
        await context.close();
        finish();
      });
    }
  }
}
