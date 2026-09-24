/**
 * The weekly SEO job. Run from landing/:  npm run seo:weekly
 *
 *   1 gsc      Search Console numbers + queries we already appear for
 *   2 suggest  new keyword ideas from Google's search suggestions
 *   3 plan     AI: map / write / ignore each open keyword, pick this week's posts
 *   4 write    AI: write those posts, checked against hard quality rules
 *   5 meta     AI: rewrite snippets of pages that rank but don't get clicked
 *   6 links    internal links for keywords close to page 1
 *
 * Needs GSC_SERVICE_ACCOUNT_JSON (or _FILE) for steps 1, 5, 6 and
 * GEMINI_API_KEY or OPENAI_API_KEY for steps 3-5. Missing credentials skip
 * the steps that need them. Every change lands in files the site reads at
 * build time; nothing is published until the pull request is merged.
 */

import { readKeywords, writeKeywords, sitemapPaths, writeText, today } from "./lib/files.mjs";
import { hasGsc } from "./lib/gsc.mjs";
import { hasLlm } from "./lib/llm.mjs";
import { buildReport } from "./report.mjs";
import gscStep from "./gsc.mjs";
import suggestStep from "./suggest.mjs";
import planStep from "./plan.mjs";
import writeStep from "./write.mjs";
import metaStep from "./meta.mjs";
import linksStep from "./links.mjs";

const ctx = {
  site: (process.env.SEO_SITE_URL || "https://www.ezzysync.com").replace(/\/$/, ""),
  date: today(),
  keywords: await readKeywords(),
  summary: [],
  report: {},
  errors: [],
};
ctx.sitePaths = await sitemapPaths(ctx.site);

const NO_GSC = "no Search Console key";
const NO_AI = "no GEMINI_API_KEY / OPENAI_API_KEY";
const steps = [
  // name, step, missing requirement (null = can run)
  ["Search Console", gscStep, hasGsc() ? null : NO_GSC],
  ["Google suggestions", suggestStep, null],
  ["Planning", planStep, hasLlm() ? null : NO_AI],
  ["Blog posts", writeStep, hasLlm() ? null : NO_AI],
  ["Titles/descriptions", metaStep, !hasGsc() ? NO_GSC : hasLlm() ? null : NO_AI],
  ["Internal links", linksStep, hasGsc() ? null : NO_GSC],
];

for (const [name, step, missing] of steps) {
  if (missing) {
    ctx.summary.push(`${name}: skipped (${missing})`);
    continue;
  }
  if (["Titles/descriptions", "Internal links"].includes(name) && !ctx.gsc) {
    ctx.summary.push(`${name}: skipped (Search Console step failed)`);
    continue;
  }
  try {
    console.log(`→ ${name}`);
    await step(ctx);
  } catch (e) {
    ctx.errors.push(`${name}: ${e.message}`);
    console.error(`✗ ${name}: ${e.message}`);
  }
}

await writeKeywords(ctx.keywords);
const report = buildReport(ctx);
await writeText(`seo/reports/weekly-${ctx.date}.md`, report);
console.log("\n" + report);
