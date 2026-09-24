import { askJson } from "./lib/llm.mjs";
import { readJson, writeJson, livePageMeta, readText, today, daysBetween } from "./lib/files.mjs";

/**
 * Step 5 - titles and descriptions that under-earn their ranking.
 * A page that ranks well but gets far fewer clicks than its position
 * normally gets, has a snippet problem. The model writes a new title and
 * description around the queries the page actually ranks for, saved to
 * src/content/seoOverrides.json (applied by withSeo() on the page).
 *
 * Each change is an experiment: after 28 days its CTR is compared with the
 * CTR before the change, and a rewrite that did worse is rolled back.
 */

const OVERRIDES = "src/content/seoOverrides.json";
const MAX_PER_WEEK = Number(process.env.SEO_META_PER_WEEK || 3);
const TEST_DAYS = 28;

// Typical organic CTR by position; a page below half of this is under-performing.
const EXPECTED_CTR = [0, 0.28, 0.16, 0.11, 0.08, 0.06, 0.045, 0.035, 0.03, 0.025, 0.02];
const expectedCtr = (pos) => EXPECTED_CTR[Math.min(10, Math.max(1, Math.round(pos)))];

const BANNED = /#\s?1\b|number one|top[- ]rated|best[- ]rated|guarantee|\d+\s?%|\bunlock\b|\belevate\b|\bseamless\b|revolutioni[sz]e|game[- ]changer/i;

function validate(m, topQuery) {
  const errors = [];
  if (!m.title || m.title.length < 30 || m.title.length > 60) errors.push(`title must be 30-60 chars (is ${m.title?.length || 0})`);
  if (!m.description || m.description.length < 110 || m.description.length > 158) errors.push(`description must be 110-158 chars (is ${m.description?.length || 0})`);
  if (BANNED.test(`${m.title} ${m.description}`)) errors.push("no rankings, guarantees, percentages or hype words");
  const words = topQuery.split(" ").filter((w) => w.length > 3);
  if (words.length && !words.some((w) => m.title.toLowerCase().includes(w))) errors.push(`title must reflect the main search "${topQuery}"`);
  if (!/ezzysync/i.test(m.title)) errors.push('end the title with "| EzzySync" or include EzzySync');
  return errors;
}

export default async function metaStep(ctx) {
  const overrides = await readJson(OVERRIDES, {});
  const pages = new Map(ctx.gsc.pages.map((p) => [p.path, p]));
  ctx.report.metaChanges = [];
  ctx.report.metaResults = [];

  // 1. Judge rewrites that have run for a full test window.
  for (const [path, o] of Object.entries(overrides)) {
    if (o.evaluated || daysBetween(o.updated, today()) < TEST_DAYS) continue;
    const now = pages.get(path);
    if (!now || !o.before) continue;
    const result = { path, before: o.before.ctr, after: now.ctr, title: o.title };
    if (now.ctr < o.before.ctr * 0.8) {
      delete overrides[path];
      result.outcome = "rolled back";
    } else {
      o.evaluated = { date: today(), ctr: now.ctr, position: now.position };
      result.outcome = now.ctr > o.before.ctr * 1.1 ? "kept (better)" : "kept (no worse)";
    }
    ctx.report.metaResults.push(result);
  }

  // 2. Pick under-performing pages that aren't already mid-test.
  const candidates = ctx.gsc.pages
    .filter((p) => p.impressions >= 100 && p.position <= 10 && p.ctr < expectedCtr(p.position) * 0.5)
    .filter((p) => !overrides[p.path] || overrides[p.path].evaluated)
    .filter((p) => ctx.sitePaths.includes(p.path))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, MAX_PER_WEEK);

  const facts = await readText("seo/product-facts.md");
  for (const page of candidates) {
    const live = await livePageMeta(ctx.site, page.path);
    const queries = (ctx.gsc.queriesByPage.get(page.path) || []).slice(0, 8);
    if (!queries.length) continue;
    let m, errors;
    for (let attempt = 0; attempt < 2; attempt++) {
      m = await askJson({
        temperature: 0.5,
        system: `You write Google search snippets for EzzySync, a travel CRM for Indian travel agencies and tour operators. Only use facts from:\n${facts}\nAnswer with JSON only.`,
        prompt: `Page: ${ctx.site}${page.path}
H1: ${live.h1}
Current title: ${live.title}
Current description: ${live.description}
It ranks at position ${page.position.toFixed(1)} but gets ${(page.ctr * 100).toFixed(1)}% clicks, far below normal for that position.
Searches it ranks for (query | impressions | position):
${queries.map((q) => `- ${q.q} | ${q.impressions} | ${q.position.toFixed(1)}`).join("\n")}

Write a title and meta description that match what these searchers want, so they choose this result. Be specific and concrete (what they get on the page), not hype. The page content is not changing, so promise only what the H1 and current title already cover.
Return {"title":"30-60 chars","description":"110-158 chars"}${errors ? `\nPrevious attempt rejected: ${errors.join("; ")}` : ""}`,
      });
      errors = validate(m, queries[0].q);
      if (!errors.length) break;
    }
    if (errors.length) continue;
    if (m.title === live.title && m.description === live.description) continue;

    overrides[page.path] = {
      title: m.title,
      description: m.description,
      updated: today(),
      reason: `pos ${page.position.toFixed(1)}, CTR ${(page.ctr * 100).toFixed(1)}% vs ~${(expectedCtr(page.position) * 100).toFixed(0)}% normal`,
      before: { title: live.title, description: live.description, ctr: page.ctr, position: page.position, impressions: page.impressions },
    };
    ctx.report.metaChanges.push({ path: page.path, from: live.title, to: m.title, reason: overrides[page.path].reason });
  }

  await writeJson(OVERRIDES, overrides);
  ctx.summary.push(`Titles/descriptions: ${ctx.report.metaChanges.length} rewritten, ${ctx.report.metaResults.length} earlier rewrites judged`);
}
