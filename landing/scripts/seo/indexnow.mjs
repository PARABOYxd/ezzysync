/**
 * Tells Bing, Yandex, Seznam and other IndexNow engines about pages that
 * changed recently, so they recrawl within hours instead of weeks.
 * Runs after every production deploy (.github/workflows/seo-indexnow.yml).
 *
 *   node scripts/seo/indexnow.mjs            -> URLs with lastmod in the last 8 days
 *   INDEXNOW_DAYS=365 node scripts/seo/indexnow.mjs   -> resubmit everything
 *
 * Google does not take IndexNow; it re-reads sitemap.xml on its own.
 * The key is public by design - it just proves we own the site.
 */

const SITE = (process.env.SEO_SITE_URL || "https://www.ezzysync.com").replace(/\/$/, "");
const KEY = "b42d10cf9707b5f19c562145da1afdb4";
const DAYS = Number(process.env.INDEXNOW_DAYS || 8);

const xml = await (await fetch(`${SITE}/sitemap.xml`)).text();
const since = Date.now() - DAYS * 86400000;
const urls = [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)]
  .filter(([, , lastmod]) => new Date(lastmod).getTime() >= since)
  .map(([, loc]) => loc);

if (!urls.length) {
  console.log(`IndexNow: nothing changed in the last ${DAYS} days`);
  process.exit(0);
}

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls }),
});
console.log(`IndexNow: submitted ${urls.length} URLs -> HTTP ${res.status}`);
urls.forEach((u) => console.log("  " + u));
// 200/202 = accepted. 422 usually means the key file isn't live yet.
if (res.status >= 400) process.exit(1);
