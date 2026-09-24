/**
 * SEO audit for the marketing site. No dependencies.
 *
 *   npm run build && npm start          (or point at production)
 *   npm run seo:audit                   -> http://localhost:3000
 *   BASE_URL=https://www.ezzysync.com npm run seo:audit
 *
 * Crawls every page reachable from "/" plus every URL in sitemap.xml and
 * reports:
 *   - broken internal links (4xx/5xx) and which pages link to them
 *   - orphan pages: in the sitemap, but no other page links to them
 *   - indexable pages missing from the sitemap
 *   - missing / duplicate / over-long titles and descriptions
 *   - pages without exactly one <h1>, or without a canonical
 *   - live keywords in seo/keywords.csv whose target_url isn't in the sitemap
 *
 * Exits 1 when there are broken links or pages missing a title, so it can
 * gate a deploy in CI.
 */

import { readFile } from "node:fs/promises";

const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const SITE = "https://www.ezzysync.com";
const SKIP = [/^\/app(\/|$)/, /^\/api\//, /^\/_next\//, /\.(png|jpe?g|webp|avif|svg|ico|pdf|xml|txt)$/i];

const toPath = (href, from = "/") => {
  try {
    const u = new URL(href, BASE + from);
    const host = u.origin;
    if (host !== BASE && host !== SITE && host !== SITE.replace("www.", "")) return null;
    return u.pathname.replace(/\/$/, "") || "/";
  } catch {
    return null;
  }
};

const pick = (html, re) => (html.match(re)?.[1] || "").replace(/&amp;/g, "&").trim();

async function fetchPage(path) {
  const res = await fetch(BASE + path, { redirect: "manual" });
  const html = res.status === 200 ? await res.text() : "";
  return { status: res.status, location: res.headers.get("location"), html };
}

const sitemapXml = await (await fetch(`${BASE}/sitemap.xml`)).text();
const sitemap = new Set([...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => toPath(m[1])).filter(Boolean));

const pages = new Map(); // path -> result
const inbound = new Map(); // path -> Set(source paths)
const queue = ["/", ...sitemap];

while (queue.length) {
  const path = queue.shift();
  if (pages.has(path) || SKIP.some((re) => re.test(path))) continue;
  const r = await fetchPage(path);
  pages.set(path, r);
  if (r.status >= 300 && r.status < 400 && r.location) {
    const to = toPath(r.location, path);
    if (to) queue.push(to);
    continue;
  }
  if (r.status !== 200) continue;

  r.title = pick(r.html, /<title[^>]*>([^<]*)<\/title>/i);
  r.description = pick(r.html, /<meta[^>]+name="description"[^>]+content="([^"]*)"/i);
  r.canonical = pick(r.html, /<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i);
  r.h1 = (r.html.match(/<h1[\s>]/gi) || []).length;
  r.noindex = /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(r.html);

  for (const [, href] of r.html.matchAll(/<a\s[^>]*href="([^"#]+)/gi)) {
    const to = toPath(href, path);
    if (!to || to === path || SKIP.some((re) => re.test(to))) continue;
    if (!inbound.has(to)) inbound.set(to, new Set());
    inbound.get(to).add(path);
    if (!pages.has(to)) queue.push(to);
  }
}

const problems = { broken: [], orphans: [], notInSitemap: [], meta: [], keywords: [] };

for (const [path, r] of pages) {
  if (r.status >= 400) problems.broken.push(`${r.status} ${path}  <- linked from ${[...(inbound.get(path) || [])].join(", ") || "sitemap"}`);
  if (r.status !== 200) continue;
  if (sitemap.has(path) && path !== "/" && !inbound.has(path)) problems.orphans.push(path);
  if (!r.noindex && !sitemap.has(path)) problems.notInSitemap.push(path);
  if (r.noindex) continue;
  if (!r.title) problems.meta.push(`${path}: missing <title>`);
  else if (r.title.length > 65) problems.meta.push(`${path}: title ${r.title.length} chars (aim for <= 60)`);
  if (!r.description) problems.meta.push(`${path}: missing meta description`);
  else if (r.description.length > 165) problems.meta.push(`${path}: description ${r.description.length} chars (aim for <= 160)`);
  if (r.h1 !== 1) problems.meta.push(`${path}: ${r.h1} <h1> tags`);
  if (!r.canonical) problems.meta.push(`${path}: no canonical`);
  else if (toPath(r.canonical) !== path) problems.meta.push(`${path}: canonical points to ${r.canonical}`);
}

const dupes = (field) => {
  const seen = new Map();
  for (const [path, r] of pages) if (r[field] && !r.noindex) seen.set(r[field], [...(seen.get(r[field]) || []), path]);
  for (const [value, paths] of seen) if (paths.length > 1) problems.meta.push(`duplicate ${field} on ${paths.join(", ")}: "${value.slice(0, 70)}"`);
};
dupes("title");
dupes("description");

try {
  const csv = await readFile(new URL("../../seo/keywords.csv", import.meta.url), "utf8");
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const cols = header.split(",");
  for (const row of rows) {
    const k = Object.fromEntries(row.split(",").map((v, i) => [cols[i], v]));
    if (k.status === "live" && !sitemap.has(k.target_url)) problems.keywords.push(`"${k.keyword}" -> ${k.target_url} is marked live but not in the sitemap`);
  }
} catch (e) {
  problems.keywords.push(`could not read seo/keywords.csv: ${e.message}`);
}

const section = (name, list) => {
  console.log(`\n${list.length ? "✗" : "✓"} ${name} (${list.length})`);
  list.forEach((l) => console.log("   " + l));
};

console.log(`SEO audit of ${BASE}: ${pages.size} URLs crawled, ${sitemap.size} in sitemap`);
section("Broken internal links", problems.broken);
section("Orphan pages (in sitemap, nothing links to them)", problems.orphans);
section("Indexable pages missing from sitemap", problems.notInSitemap);
section("Title / description / h1 / canonical", problems.meta);
section("Keyword map", problems.keywords);

const hasTitleErrors = problems.meta.some((m) => m.includes("missing <title>"));
process.exit(problems.broken.length || hasTitleErrors ? 1 : 0);
