import { readJson, writeJson, today } from "./lib/files.mjs";

/**
 * Step 6 - internal links for keywords that are almost on page 1.
 * A query ranking at position 8-20 gets its phrase added to
 * src/content/internalLinks.json, pointing at the page Google ranks for it.
 * From the next build, every markdown post that mentions the phrase links
 * to that page with it as anchor text, and every post that mentions it
 * lists the page under "See how EzzySync handles this".
 */

const LINKS = "src/content/internalLinks.json";
const MAX_PER_WEEK = Number(process.env.SEO_LINKS_PER_WEEK || 5);
const SKIP_TARGETS = new Set(["/", "/blog", "/features", "/solutions"]);

export default async function linksStep(ctx) {
  const links = await readJson(LINKS, []);
  const phrases = new Set(links.map((l) => l.phrase));
  const added = [];

  const striking = [...ctx.gsc.byQuery.values()]
    .filter((q) => q.position >= 8 && q.position <= 20 && q.impressions >= 20)
    .filter((q) => q.topPage && !SKIP_TARGETS.has(q.topPage) && ctx.sitePaths.includes(q.topPage))
    .filter((q) => {
      const n = q.q.split(" ").length;
      return n >= 2 && n <= 5 && !/ezzysync|easysync/.test(q.q);
    })
    .sort((a, b) => b.impressions - a.impressions);

  for (const q of striking) {
    if (added.length >= MAX_PER_WEEK) break;
    if (phrases.has(q.q)) continue;
    // A longer phrase already pointing at the same page covers this one.
    if (links.some((l) => l.href === q.topPage && l.phrase.includes(q.q))) continue;
    const entry = { phrase: q.q, href: q.topPage, added: today(), reason: `position ${q.position.toFixed(1)}, ${q.impressions} impressions` };
    links.push(entry);
    phrases.add(q.q);
    added.push(entry);
  }

  await writeJson(LINKS, links);
  ctx.report.newLinks = added;
  ctx.report.striking = striking.slice(0, 15);
  ctx.summary.push(`Internal links: ${added.length} new keyword links for pages close to page 1`);
}
