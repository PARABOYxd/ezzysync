import { test, expect } from '@playwright/test';
import { sitemapPaths, watchErrors, horizontalOverflow, overflowingElements, scrollThrough } from './helpers.js';

// Every page in the sitemap, on every viewport in landing.config.js.
let paths = [];
test.beforeAll(async ({ request }) => {
  paths = await sitemapPaths(request);
});

test('sitemap lists the pages we expect', async () => {
  expect(paths.length).toBeGreaterThanOrEqual(25);
  for (const p of ['/', '/pricing', '/features', '/blog', '/about', '/contact', '/free-itinerary-builder']) {
    expect(paths, `${p} missing from sitemap`).toContain(p);
  }
});

test('every sitemap page renders cleanly and fits the screen', async ({ page }) => {
  test.setTimeout(240_000);
  const seenTitles = new Map();
  const seenDescriptions = new Map();
  const failures = [];

  for (const p of paths) {
    const problems = watchErrors(page);
    const res = await page.goto(p, { waitUntil: 'load' });
    const here = `${p} [${test.info().project.name}]`;
    if (res.status() !== 200) { failures.push(`${here}: HTTP ${res.status()}`); continue; }
    await scrollThrough(page);

    const info = await page.evaluate(() => ({
      h1: document.querySelectorAll('h1').length,
      title: document.title,
      desc: document.querySelector('meta[name="description"]')?.content || '',
      canonical: document.querySelector('link[rel="canonical"]')?.href || '',
      noAlt: [...document.images].filter((i) => !i.hasAttribute('alt')).map((i) => i.src.slice(-50)),
      broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.loading !== 'lazy').map((i) => i.src.slice(-50)),
      emptyLinks: [...document.querySelectorAll('a')].filter((a) => !a.textContent.trim() && !a.getAttribute('aria-label') && !a.querySelector('img[alt]:not([alt=""])')).length,
      emptyButtons: [...document.querySelectorAll('button')].filter((b) => !b.textContent.trim() && !b.getAttribute('aria-label') && !b.title).length,
      main: !!document.querySelector('main, [role=main]'),
    }));

    if (info.h1 !== 1) failures.push(`${here}: ${info.h1} <h1> (want exactly 1)`);
    if (!info.title || info.title.length < 15) failures.push(`${here}: weak title "${info.title}"`);
    if (info.title.length > 70) failures.push(`${here}: title is ${info.title.length} chars, Google cuts at ~60`);
    if (!info.desc) failures.push(`${here}: no meta description`);
    if (info.desc.length > 175) failures.push(`${here}: meta description is ${info.desc.length} chars`);
    if (!info.canonical) failures.push(`${here}: no canonical`);
    else if (new URL(info.canonical).pathname.replace(/\/$/, '') !== p.replace(/\/$/, '')) failures.push(`${here}: canonical ${info.canonical} does not match page`);
    if (seenTitles.has(info.title)) failures.push(`${here}: same <title> as ${seenTitles.get(info.title)}`);
    seenTitles.set(info.title, p);
    if (info.desc) {
      if (seenDescriptions.has(info.desc)) failures.push(`${here}: same description as ${seenDescriptions.get(info.desc)}`);
      seenDescriptions.set(info.desc, p);
    }
    if (info.noAlt.length) failures.push(`${here}: images with no alt: ${info.noAlt.join(', ')}`);
    if (info.broken.length) failures.push(`${here}: broken images: ${info.broken.join(', ')}`);
    if (info.emptyLinks) failures.push(`${here}: ${info.emptyLinks} link(s) with no text or aria-label`);
    if (info.emptyButtons) failures.push(`${here}: ${info.emptyButtons} button(s) with no text or aria-label`);
    if (!info.main) failures.push(`${here}: no <main> landmark`);

    const over = await horizontalOverflow(page);
    if (over > 0) failures.push(`${here}: sideways scroll of ${over}px (${(await overflowingElements(page)).join(' | ')})`);

    for (const pr of problems) failures.push(`${here}: ${pr}`);
  }
  expect(failures, failures.join('\n')).toEqual([]);
});

test('unknown URL shows the 404 page with a way home', async ({ page }) => {
  const res = await page.goto('/this-page-does-not-exist');
  expect(res.status()).toBe(404);
  await expect(page.getByRole('link', { name: /home|back|ezzysync/i }).first()).toBeVisible();
});

test('legacy redirects land on a real page', async ({ page }) => {
  for (const from of ['/blog/', '/features/', '/pricing/']) {
    const res = await page.goto(from);
    expect(res.status(), from).toBe(200);
  }
});
