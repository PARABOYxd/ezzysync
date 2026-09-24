import { CURRENT, PREVIOUS, gscQuery, toPath } from "./lib/gsc.mjs";
import { cleanKeyword, today } from "./lib/files.mjs";

/**
 * Step 1 - Search Console.
 * Pulls the last 28 days (and the 28 before), refreshes the gsc_* numbers on
 * every keyword in keywords.csv, and adds queries the site already appears
 * for as status "tracking" (target = the page Google ranks for it).
 * Leaves the aggregated data on ctx.gsc for the later steps.
 */

const MIN_IMPRESSIONS_TO_TRACK = Number(process.env.GSC_MIN_IMPRESSIONS || 10);

export function guessIntent(q) {
  if (/ezzysync|easysync|ezzy sync|easy sync/.test(q)) return "navigational";
  if (/^(what|how|why|when|which|is|can|does|should)\b|\bhow to\b|\bguide\b|\btips\b|\bideas\b|\bexample/.test(q)) return "informational";
  if (/\b(best|software|crm|tool|app|pricing|price|cost|vs|alternative|free|system|platform)\b/.test(q)) return "commercial";
  return "problem";
}

export default async function gscStep(ctx) {
  const [queryPage, pagesNow, pagesBefore, pageQueryNow, [totNow], [totBefore]] = await Promise.all([
    gscQuery(CURRENT, ["query", "page"]),
    gscQuery(CURRENT, ["page"]),
    gscQuery(PREVIOUS, ["page"]),
    gscQuery(CURRENT, ["page", "query"]),
    gscQuery(CURRENT, []),
    gscQuery(PREVIOUS, []),
  ]);

  // Per query: totals, weighted position, and the page with most impressions.
  const byQuery = new Map();
  for (const r of queryPage) {
    const q = cleanKeyword(r.keys[0]);
    if (!q) continue;
    const a = byQuery.get(q) || { q, impressions: 0, clicks: 0, posSum: 0, topPage: null, topImpr: 0 };
    a.impressions += r.impressions;
    a.clicks += r.clicks;
    a.posSum += r.position * r.impressions;
    if (r.impressions > a.topImpr) Object.assign(a, { topPage: toPath(r.keys[1]), topImpr: r.impressions });
    byQuery.set(q, a);
  }
  for (const a of byQuery.values()) {
    a.position = a.posSum / a.impressions;
    a.ctr = a.clicks / a.impressions;
  }

  // Per page: this period vs last, plus its top queries.
  const before = new Map(pagesBefore.map((r) => [toPath(r.keys[0]), r]));
  const pages = pagesNow.map((r) => {
    const path = toPath(r.keys[0]);
    const prev = before.get(path) || { clicks: 0, impressions: 0, ctr: 0, position: 0 };
    return { path, clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position, prev };
  });
  const queriesByPage = new Map();
  for (const r of pageQueryNow) {
    const path = toPath(r.keys[0]);
    if (!queriesByPage.has(path)) queriesByPage.set(path, []);
    queriesByPage.get(path).push({ q: cleanKeyword(r.keys[1]), impressions: r.impressions, clicks: r.clicks, position: r.position });
  }
  for (const list of queriesByPage.values()) list.sort((a, b) => b.impressions - a.impressions);

  ctx.gsc = {
    byQuery,
    pages,
    queriesByPage,
    totals: { now: totNow || { clicks: 0, impressions: 0, ctr: 0, position: 0 }, before: totBefore || { clicks: 0, impressions: 0, ctr: 0, position: 0 } },
  };

  // Refresh numbers on tracked keywords, then add new ones.
  const stamp = today();
  const known = new Set(ctx.keywords.rows.map((r) => r.keyword));
  for (const r of ctx.keywords.rows) {
    const a = byQuery.get(r.keyword);
    Object.assign(r, a
      ? { gsc_impressions: a.impressions, gsc_clicks: a.clicks, gsc_ctr: a.ctr.toFixed(3), gsc_position: a.position.toFixed(1), gsc_updated: stamp }
      : { gsc_impressions: 0, gsc_clicks: 0, gsc_ctr: "", gsc_position: "", gsc_updated: stamp });
  }
  const added = [...byQuery.values()]
    .filter((a) => !known.has(a.q) && a.impressions >= MIN_IMPRESSIONS_TO_TRACK)
    .sort((a, b) => b.impressions - a.impressions);
  for (const a of added) {
    ctx.keywords.rows.push({
      keyword: a.q, search_intent: guessIntent(a.q), country: "IN", target_url: a.topPage, status: "tracking",
      source: "gsc", updated_at: stamp,
      gsc_impressions: a.impressions, gsc_clicks: a.clicks, gsc_ctr: a.ctr.toFixed(3), gsc_position: a.position.toFixed(1), gsc_updated: stamp,
    });
  }

  ctx.summary.push(`Search Console: ${byQuery.size} queries, ${added.length} new ones added to keywords.csv`);
  ctx.report.newGscKeywords = added;
}
