import { test, expect } from '@playwright/test';

const DESKTOP_LINKS = [
  ['Features', '/features'],
  ['Solutions', '/solutions'],
  ['Itinerary Builder', '/free-itinerary-builder'],
  ['Pricing', '/pricing'],
  ['About', '/about'],
  ['Blog', '/blog'],
  ['Contact Sales', '/contact'],
];

const isDesktopNav = (page) => (page.viewportSize()?.width ?? 0) >= 1024;

test.describe('header', () => {
  test('logo goes home from any page', async ({ page }) => {
    await page.goto('/pricing');
    await page.locator('header a[href="/"]').first().click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('call-to-action links point at the CRM sign-up and sign-in pages', async ({ page }) => {
    await page.goto('/');
    if (page.viewportSize().width < 640) {
      await page.getByRole('button', { name: /toggle navigation menu/i }).click();
    }
    const trial = page.locator('header a', { hasText: 'Start Free Trial' }).first();
    const signIn = page.locator('header a', { hasText: 'Sign In' }).first();
    await expect(trial).toHaveAttribute('href', /^https?:\/\/[^/]+\/register$/);
    await expect(signIn).toHaveAttribute('href', /^https?:\/\/[^/]+\/login$/);
  });

  test('header stays visible after scrolling', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, 1500));
    await expect(page.locator('header').first()).toBeInViewport();
  });
});

test.describe('desktop nav', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!isDesktopNav(page), 'desktop-only (nav collapses under 1024px)');
  });

  for (const [label, href] of DESKTOP_LINKS) {
    test(`"${label}" opens ${href}`, async ({ page }) => {
      await page.goto('/');
      await page.locator('nav[aria-label="Main"]').getByRole('link', { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${href}/?$`));
      await expect(page.locator('h1').first()).toBeVisible();
    });
  }

  test('current section is marked, including on nested pages', async ({ page }) => {
    for (const [path, label] of [
      ['/features', 'Features'],
      ['/features/lead-management', 'Features'],
      ['/solutions/travel-agencies', 'Solutions'],
      ['/blog/chatgpt-itinerary-travel-agents', 'Blog'],
    ]) {
      await page.goto(path);
      const link = page.locator('nav[aria-label="Main"]').getByRole('link', { name: label, exact: true });
      await expect(link, `${label} should be current on ${path}`).toHaveAttribute('aria-current', 'page');
    }
  });

  test('only one nav item is marked current', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('nav[aria-label="Main"] [aria-current="page"]')).toHaveCount(1);
  });
});

test.describe('mobile menu', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(isDesktopNav(page), 'phone/tablet only');
    await page.goto('/');
  });

  const toggle = (page) => page.getByRole('button', { name: /toggle navigation menu/i });
  const drawerLink = (page, name) => page.locator('header').getByRole('link', { name, exact: true });

  test('hamburger opens and closes the drawer', async ({ page }) => {
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(drawerLink(page, 'Pricing')).toBeHidden();
    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(drawerLink(page, 'Pricing')).toBeVisible();
    await toggle(page).click();
    await expect(drawerLink(page, 'Pricing')).toBeHidden();
  });

  test('every drawer link navigates and closes the drawer', async ({ page }) => {
    for (const [, href] of DESKTOP_LINKS) {
      await toggle(page).click();
      await page.locator(`header a[href="${href}"]`).last().click();
      await expect(page).toHaveURL(new RegExp(`${href}/?$`));
      await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
    }
  });

  test('Escape closes the drawer', async ({ page }) => {
    await toggle(page).click();
    await page.keyboard.press('Escape');
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
  });

  test('drawer closes on browser back after navigating', async ({ page }) => {
    await toggle(page).click();
    await page.locator('header a[href="/pricing"]').last().click();
    await expect(page).toHaveURL(/\/pricing\/?$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
  });

  test('drawer fits the screen and its buttons are tappable', async ({ page }) => {
    await toggle(page).click();
    const boxes = await page.locator('header a:visible, header button:visible').evaluateAll((els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect();
        return { t: e.textContent.trim().slice(0, 20) || e.getAttribute('aria-label'), h: r.height, right: r.right };
      }));
    const vw = page.viewportSize().width;
    for (const b of boxes) {
      expect(b.right, `${b.t} runs off screen`).toBeLessThanOrEqual(vw + 1);
      expect(b.h, `${b.t} is only ${Math.round(b.h)}px tall`).toBeGreaterThanOrEqual(32);
    }
  });

  test('menu button is at least 40x40 for thumbs', async ({ page }) => {
    const box = await toggle(page).boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(40);
    expect(box.height).toBeGreaterThanOrEqual(40);
  });
});

test.describe('footer', () => {
  test('footer links all resolve', async ({ page, request }) => {
    await page.goto('/');
    const hrefs = await page.locator('footer a[href^="/"]').evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute('href').split('#')[0]))]);
    expect(hrefs.length).toBeGreaterThan(5);
    for (const h of hrefs) {
      const r = await request.get(h || '/');
      expect(r.status(), `footer link ${h}`).toBe(200);
    }
  });

  test('contact details match the single source of truth', async ({ page }) => {
    await page.goto('/contact');
    const html = await page.content();
    expect(html).toContain('918104665986');
    expect(html).toContain('support@ezzysync.com');
    for (const n of [...html.matchAll(/wa\.me\/(\d+)/g)].map((m) => m[1])) expect(n).toBe('918104665986');
  });
});
