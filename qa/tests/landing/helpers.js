import { expect } from '@playwright/test';

/** Hosts the site legitimately calls; anything else failing is a real bug. */
const IGNORED_REQUEST_HOSTS = [
  'vercel-insights.com', 'vitals.vercel-insights.com', 'va.vercel-scripts.com',
  'google-analytics.com', 'googletagmanager.com', 'fonts.gstatic.com', 'fonts.googleapis.com',
];

/** Pages in the sitemap that live in the CRM app, not in this Next.js site. */
export const isLandingPath = (p) => !p.startsWith('/app/');

/** Paths from the live sitemap.xml, rewritten to the site under test. */
export async function sitemapPaths(request) {
  const res = await request.get('/sitemap.xml');
  expect(res.status(), 'sitemap.xml should load').toBe(200);
  const xml = await res.text();
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname || '/');
  return [...new Set(paths)].filter(isLandingPath);
}

/** Collects console errors, uncaught exceptions and failed same-site requests. */
export function watchErrors(page) {
  const problems = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) problems.push(`console: ${m.text()}`);
  });
  page.on('response', (r) => {
    const u = new URL(r.url());
    if (r.status() >= 400 && !u.pathname.startsWith('/_vercel/') && !IGNORED_REQUEST_HOSTS.some((h) => u.hostname.endsWith(h))) {
      problems.push(`HTTP ${r.status()}: ${u.pathname}`);
    }
  });
  return problems;
}

/** Width of the page content beyond the viewport, in px (0 = fits). */
export function horizontalOverflow(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    return Math.max(0, document.documentElement.scrollWidth - vw);
  });
}

/** Elements wider than the viewport - names the culprit when a page overflows. */
export function overflowingElements(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const out = [];
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > vw + 1) {
        let fixedAncestor = false;
        for (let n = el; n && n !== document.body; n = n.parentElement) {
          const cs = getComputedStyle(n);
          if (cs.overflowX === 'hidden' || cs.overflowX === 'auto' || cs.overflowX === 'scroll') { fixedAncestor = true; break; }
        }
        if (!fixedAncestor) out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} right=${Math.round(r.right)}`);
      }
      if (out.length >= 5) break;
    }
    return out;
  });
}

/** Scrolls the whole page so lazy / scroll-reveal content mounts. */
export async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = Math.max(300, window.innerHeight * 0.8);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
}
