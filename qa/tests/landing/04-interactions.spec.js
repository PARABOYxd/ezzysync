import { test, expect } from '@playwright/test';
import { sitemapPaths, horizontalOverflow, scrollThrough } from './helpers.js';

const isPhone = (page) => page.viewportSize().width < 768;

test.describe('FAQ accordion', () => {
  test('first answer is open, clicking switches, clicking again closes', async ({ page }) => {
    await page.goto('/');
    const buttons = page.locator('#faq button[aria-expanded]');
    await buttons.first().scrollIntoViewIfNeeded();
    await expect(buttons.nth(0)).toHaveAttribute('aria-expanded', 'true');
    await expect(buttons.nth(1)).toHaveAttribute('aria-expanded', 'false');
    await buttons.nth(1).click();
    await expect(buttons.nth(1)).toHaveAttribute('aria-expanded', 'true');
    await expect(buttons.nth(0)).toHaveAttribute('aria-expanded', 'false');
    await buttons.nth(1).click();
    await expect(buttons.nth(1)).toHaveAttribute('aria-expanded', 'false');
  });

  test('only one answer is visible at a time and text is not clipped', async ({ page }) => {
    await page.goto('/');
    const buttons = page.locator('#faq button[aria-expanded]');
    const n = await buttons.count();
    expect(n).toBeGreaterThanOrEqual(5);
    for (let i = 0; i < n; i++) {
      await buttons.nth(i).scrollIntoViewIfNeeded();
      if ((await buttons.nth(i).getAttribute('aria-expanded')) !== 'true') await buttons.nth(i).click();
      await expect(page.locator('#faq button[aria-expanded="true"]')).toHaveCount(1);
      const panel = buttons.nth(i).locator('xpath=following-sibling::div[1]');
      await expect(panel).toBeVisible();
      const clipped = await panel.evaluate((e) => e.scrollWidth > e.clientWidth + 1);
      expect(clipped, `FAQ #${i + 1} answer is cut off sideways`).toBe(false);
    }
  });

  test('keyboard: Enter and Space toggle', async ({ page }) => {
    await page.goto('/');
    const b = page.locator('#faq button[aria-expanded]').nth(2);
    await b.scrollIntoViewIfNeeded();
    await b.focus();
    await page.keyboard.press('Enter');
    await expect(b).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Space');
    await expect(b).toHaveAttribute('aria-expanded', 'false');
  });

  test('buttons control a labelled panel (aria-controls)', async ({ page }) => {
    await page.goto('/');
    const b = page.locator('#faq button[aria-expanded]').first();
    const id = await b.getAttribute('aria-controls');
    expect(id, 'FAQ button needs aria-controls').toBeTruthy();
    await expect(page.locator(`#${id}`)).toBeVisible();
  });

  test('FAQ content is in the HTML for crawlers (not only after a click)', async ({ request }) => {
    const html = await (await request.get('/')).text();
    const questions = await (async () => {
      const m = [...html.matchAll(/"@type":"Question","name":"([^"]+)"/g)];
      return m.length;
    })();
    // FAQPage JSON-LD: Google shows these as rich results
    expect(questions, 'FAQPage JSON-LD questions on /').toBeGreaterThanOrEqual(3);
  });
});

test.describe('floating call-to-action', () => {
  test('hidden at the top, shown after scrolling past the hero', async ({ page }) => {
    await page.goto('/');
    const phone = isPhone(page);
    const widget = phone
      ? page.locator('div.fixed.bottom-0').filter({ hasText: 'Start Free Trial' })
      : page.getByRole('link', { name: /chat with ezzysync on whatsapp/i });
    await expect(widget).toHaveCSS('opacity', '0');
    await page.evaluate(() => window.scrollTo(0, 1200));
    await expect(widget).toHaveCSS('opacity', '1');
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(widget).toHaveCSS('opacity', '0');
  });

  test('phone: bar never covers the last line of the footer', async ({ page }) => {
    test.skip(!isPhone(page), 'bottom bar is phone-only');
    await page.goto('/');
    await scrollThrough(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => {
      const bar = [...document.querySelectorAll('div.fixed')].find((d) => d.textContent.includes('Start Free Trial'));
      const footer = document.querySelector('footer');
      const last = [...footer.querySelectorAll('p, a, span')].filter((e) => e.textContent.trim()).pop();
      return { barTop: bar.getBoundingClientRect().top, lastBottom: last.getBoundingClientRect().bottom, text: last.textContent.trim().slice(0, 40) };
    });
    expect(r.lastBottom, `footer text "${r.text}" is hidden under the sticky bar`).toBeLessThanOrEqual(r.barTop + 1);
  });

  test('phone: sticky bar is not shown on the free tool where it would cover the form', async ({ page }) => {
    test.skip(!isPhone(page), 'phone-only');
    await page.goto('/free-itinerary-builder');
    await page.evaluate(() => window.scrollTo(0, 1500));
    const bar = page.locator('div.fixed.bottom-0').filter({ hasText: 'Start Free Trial' });
    // either not rendered on this page, or it must not sit on top of the Generate button
    if (await bar.count()) {
      const gen = page.getByRole('button', { name: /generate \/ update with ai/i });
      await gen.scrollIntoViewIfNeeded();
      const [b, g] = await Promise.all([bar.boundingBox(), gen.boundingBox()]);
      expect(g.y + g.height, 'Generate button hidden under sticky bar').toBeLessThanOrEqual(b.y + 1);
    }
  });
});

test.describe('links', () => {
  test('every internal link on every page resolves (no 404s)', async ({ page, request }) => {
    test.skip(test.info().project.name !== 'desktop', 'link graph is the same on every viewport');
    test.setTimeout(180_000);
    const paths = await sitemapPaths(request);
    const all = new Map();
    for (const p of paths) {
      await page.goto(p);
      const hrefs = await page.locator('a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
      for (const h of hrefs) {
        if (!h.startsWith('/') || h.startsWith('//')) continue;
        const clean = h.split('#')[0].split('?')[0] || p;
        if (!all.has(clean)) all.set(clean, p);
      }
    }
    const bad = [];
    for (const [href, from] of all) {
      if (href.startsWith('/app/') || href.startsWith('/_vercel')) continue;
      const r = await request.get(href, { maxRedirects: 5 });
      if (r.status() >= 400) bad.push(`${href} -> ${r.status()} (linked from ${from})`);
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });

  test('in-page #anchors point at an element that exists', async ({ page, request }) => {
    test.setTimeout(150_000);
    test.skip(test.info().project.name !== 'desktop', 'same on every viewport');
    const paths = await sitemapPaths(request);
    const bad = [];
    for (const p of paths) {
      await page.goto(p);
      const missing = await page.evaluate(() =>
        [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href').slice(1)).filter((id) => id && !document.getElementById(id)));
      for (const id of missing) bad.push(`${p}: #${id}`);
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });

  test('external links open safely in a new tab', async ({ page, request }) => {
    test.skip(test.info().project.name !== 'desktop', 'same on every viewport');
    const paths = await sitemapPaths(request);
    const bad = [];
    for (const p of paths.slice(0, 12)) {
      await page.goto(p);
      const links = await page.locator('a[target="_blank"]').evaluateAll((as) => as.map((a) => ({ href: a.href, rel: a.rel })));
      for (const l of links) if (!/noopener/.test(l.rel)) bad.push(`${p}: ${l.href} has rel="${l.rel}"`);
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });

  test('every WhatsApp link goes to the one support number; CTAs carry a prefilled message', async ({ page }) => {
    await page.goto('/');
    const links = await page.locator('a[href*="wa.me"]').evaluateAll((as) => as.map((a) => ({ href: a.href, inFooter: !!a.closest('footer') })));
    expect(links.length).toBeGreaterThan(0);
    for (const l of links) {
      const u = new URL(l.href);
      expect(u.pathname, l.href).toBe('/918104665986');
      if (!l.inFooter && !/didn/i.test(l.href)) {
        // a bare wa.me link is only fine as a fallback; call-to-action buttons should say who is writing
        expect.soft(u.searchParams.get('text') || '', `${l.href} has no prefilled text`).not.toBe('');
      }
    }
  });
});

test.describe('pricing', () => {
  test('home and /pricing show the same plans and prices', async ({ page }) => {
    await page.goto('/pricing');
    const text = await page.locator('main').innerText();
    for (const s of ['₹999', '₹2,499', 'Solo Agent', 'Agency Growth']) {
      expect(text, `${s} missing on /pricing`).toContain(s);
    }
    await page.goto('/');
    const home = await page.locator('#pricing').innerText();
    for (const s of ['₹999', '₹2,499', 'Solo Agent', 'Agency Growth']) {
      expect(home, `${s} missing in home pricing`).toContain(s);
    }
  });

  test('every "₹X per month" claim about EzzySync matches plans.js', async ({ page, request }) => {
    test.skip(test.info().project.name !== 'desktop', 'same on every viewport');
    // Competitor prices live on /compare/* and the "best CRM" roundup; sample quote amounts are not prices.
    const skip = (p) => p.startsWith('/compare/') || p.includes('best-travel-agency-crm');
    const allowed = new Set(['999', '2,499']);
    const paths = (await sitemapPaths(request)).filter((p) => !skip(p));
    const unknown = [];
    for (const p of paths) {
      const html = await (await request.get(p)).text();
      const body = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
      for (const m of body.matchAll(/₹\s?([\d,]+)\s*(?:\/|per|a)\s*(?:month|mo)\b/gi)) {
        if (!allowed.has(m[1])) unknown.push(`${p}: ₹${m[1]}/month`);
      }
    }
    expect([...new Set(unknown)], 'monthly price not in plans.js').toEqual([]);
  });

  test('"Start free trial" buttons go to the CRM sign-up', async ({ page }) => {
    await page.goto('/pricing');
    const trials = page.getByRole('link', { name: /start free trial/i });
    const n = await trials.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) await expect(trials.nth(i)).toHaveAttribute('href', /\/register$/);
  });

  test('pricing cards fit the screen', async ({ page }) => {
    await page.goto('/pricing');
    await scrollThrough(page);
    expect(await horizontalOverflow(page)).toBe(0);
  });
});

test.describe('scroll reveal', () => {
  test('content is not left invisible after scrolling (reveal animation works)', async ({ page }) => {
    await page.goto('/');
    await scrollThrough(page);
    // the observer fires a moment after the scroll, so poll instead of reading once
    await expect
      .poll(() => page.evaluate(() => [...document.querySelectorAll('.reveal')].filter((e) => getComputedStyle(e).opacity === '0').length),
        { message: 'elements still invisible after being scrolled through', timeout: 5000 })
      .toBe(0);
  });

  test('prefers-reduced-motion users see everything immediately', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(new URL('/', test.info().project.use.baseURL).href);
    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll('.reveal')].filter((e) => getComputedStyle(e).opacity === '0').length);
    await ctx.close();
    expect(hidden, 'content hidden for reduced-motion visitors').toBe(0);
  });

  test('with JavaScript off the home page still shows its content', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(new URL('/', test.info().project.use.baseURL).href);
    await expect(page.locator('h1').first()).toBeVisible();
    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll('.reveal')].filter((e) => getComputedStyle(e).opacity === '0').length);
    await ctx.close();
    expect(hidden, 'content hidden when JS is off (what crawlers without JS see)').toBe(0);
  });
});
