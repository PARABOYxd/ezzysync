/**
 * Getting around: the sidebar, the browser buttons, and the wrong addresses.
 *
 * Every sidebar link is clicked for every role and must arrive where it
 * points without breaking. The restricted member must not be shown links to
 * modules they cannot open - a link that leads to an instant redirect is a
 * broken link from where the user is sitting. Signed-out visitors must be
 * sent to login from every protected page, and addresses that do not exist
 * must get the not-found page rather than a blank one.
 */
import { test, expect, contextFor, ROLES, VIEWPORTS } from './lib/world.js';
import { APP_ROUTES, resolveRoute } from './lib/inventory.js';
import { attachMonitor, settle } from './lib/monitor.js';
import { useCases, assertHealthy } from './lib/uc.js';
import { API_URL } from '../support/fixtures.js';

test.describe.configure({ mode: 'parallel' });

for (const role of ROLES) {
  test(`sidebar · every link · ${role}`, async ({ browser, world, baseURL }) => {
    test.setTimeout(180_000);
    const { uc, finish } = useCases();
    const context = await contextFor(browser, world, role, VIEWPORTS.desktop, baseURL);
    const page = await context.newPage();
    const monitor = attachMonitor(page, API_URL);

    await page.goto('/dashboard');
    await settle(page);

    const links = await page.locator('aside a[href]').evaluateAll((els) =>
      [...new Set(els.map((a) => a.getAttribute('href')).filter((h) => h && h.startsWith('/')))]);

    await uc(`sidebar (${role}): shows at least the dashboard`, async () => {
      expect(links).toContain('/dashboard');
    });

    if (role === 'restricted') {
      for (const route of APP_ROUTES.filter((r) => r.module && !r.param)) {
        await uc(`sidebar (restricted): hides ${route.name}, which this user cannot open`, async () => {
          expect(links, `${route.path} is linked but the user lacks ${route.module}`).not.toContain(route.path);
        });
      }
    }

    for (const href of links) {
      await uc(`sidebar (${role}): "${href}" opens and renders`, async () => {
        monitor.mark();
        await page.locator(`aside a[href="${href}"]`).first().click();
        await settle(page, 300);
        expect(new URL(page.url()).pathname).toBe(href);
        await assertHealthy(page, monitor);
      });
    }

    await uc(`browser back and forward (${role}) keep the app alive`, async () => {
      monitor.mark();
      await page.goBack();
      await settle(page, 200);
      await page.goForward();
      await settle(page, 200);
      await assertHealthy(page, monitor);
    });

    await context.close();
    finish();
  });
}

test('signed out · every protected page sends you to login', async ({ browser, world, baseURL }) => {
  test.setTimeout(180_000);
  const { uc, finish } = useCases();
  const context = await contextFor(browser, world, 'anon', VIEWPORTS.desktop, baseURL);
  const page = await context.newPage();
  const monitor = attachMonitor(page, API_URL);

  for (const route of APP_ROUTES) {
    const target = resolveRoute(route, world.data) || route.path.replace(/:[a-z]+/i, 'x');
    await uc(`signed out: ${route.path} redirects to /login`, async () => {
      monitor.mark();
      await page.goto(target);
      await settle(page, 200);
      expect(new URL(page.url()).pathname).toBe('/login');
      await assertHealthy(page, monitor);
    });
  }
  await context.close();
  finish();
});

test('wrong addresses · not-found and bad ids do not break the app', async ({ browser, world, baseURL }) => {
  test.setTimeout(120_000);
  const { uc, finish } = useCases();
  const context = await contextFor(browser, world, 'admin', VIEWPORTS.desktop, baseURL);
  const page = await context.newPage();
  const monitor = attachMonitor(page, API_URL);

  const bad = [
    '/this-page-does-not-exist',
    '/leads/extra/segments',
    '/customers/00000000-0000-0000-0000-000000000000',
    '/customers/not-a-real-id',
    '/customers/%3Cscript%3Ealert(1)%3C%2Fscript%3E',
    '/quote-preview/00000000-0000-0000-0000-000000000000',
    '/quote-preview/not-a-uuid',
    '/leads?search=%27%20OR%201%3D1%20--',
    '/bookings?page=-5&limit=abc',
    '/leads?search=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E',
  ];
  for (const href of bad) {
    await uc(`wrong address "${decodeURIComponent(href)}" shows a page, not a crash`, async () => {
      monitor.mark();
      await page.goto(href);
      await settle(page, 400);
      await assertHealthy(page, monitor);
    });
  }
  await context.close();
  finish();
});
