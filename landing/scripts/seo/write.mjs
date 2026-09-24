import { askJson } from "./lib/llm.mjs";
import { existingPosts, readText, writeText, today } from "./lib/files.mjs";

/**
 * Step 4 - write the posts chosen by the planning step.
 * Every draft is checked against hard rules (length, structure, banned
 * phrases, no statistics, links only to real pages). A draft that fails
 * gets one rewrite with the list of problems; if it still fails it is
 * skipped and reported, never published half-right.
 */

const MIN_WORDS = 1100;
const MAX_WORDS = 2600;

// Phrases that make text read as machine-written, and claims we can't back.
const BANNED = [
  /\bdelve\b/i, /\bin today's\b/i, /fast-paced/i, /ever-evolving/i, /game[- ]changer/i, /revolutioni[sz]e/i,
  /\bunlock(s|ing)? the\b/i, /\belevate\b/i, /\bseamless(ly)?\b/i, /\btestament to\b/i, /\bembark\b/i,
  /navigat(e|ing) the (complex|world|landscape)/i, /\blandscape\b/i, /\bin conclusion\b/i, /look no further/i,
  /\bwhether you're\b/i, /\bharness(ing)? the power\b/i, /\bsupercharge\b/i, /\bcutting[- ]edge\b/i,
  /\bmyriad\b/i, /\btapestry\b/i, /\bbustling\b/i, /\bmoreover\b/i, /\bfurthermore\b/i,
  /#\s?1\b/, /\bnumber one\b/i, /\btop[- ]rated\b/i, /\bbest[- ]rated\b/i, /\baward[- ]winning\b/i,
  /\bguarantee[sd]?\b/i, /\btrusted by\b/i, /\bthousands of (agencies|agents|customers)\b/i,
  /\bTCS\b/, /\bTally\b/, /\bSalesforce integration\b/i, /\bGDS\b/,
];
const STATS = /\d+(\.\d+)?\s?(%|percent\b)|\b\d+x (faster|more|better)\b/i;

const words = (s) => s.split(/\s+/).filter(Boolean).length;

function validate(d, { sitePaths, takenSlugs, keyword }) {
  const errors = [];
  const md = d.markdown || "";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(d.slug || "") || d.slug.length > 70) errors.push("slug must be lowercase-kebab-case, max 70 chars");
  if (takenSlugs.has(d.slug)) errors.push(`slug "${d.slug}" already exists`);
  if (!d.metaTitle || d.metaTitle.length > 60 || d.metaTitle.length < 30) errors.push(`metaTitle must be 30-60 chars (is ${d.metaTitle?.length || 0})`);
  if (!d.metaDescription || d.metaDescription.length > 158 || d.metaDescription.length < 110) errors.push(`metaDescription must be 110-158 chars (is ${d.metaDescription?.length || 0})`);
  if (/^#\s/m.test(md)) errors.push("do not use a top-level # heading; the page adds the H1");
  if ((md.match(/^##\s/gm) || []).length < 5) errors.push("needs at least 4 ## sections plus the FAQ section");
  const faq = md.split(/^##\s+frequently asked questions\s*$/im)[1];
  if (!faq || (faq.match(/^###\s/gm) || []).length < 3) errors.push('needs a "## Frequently asked questions" section with at least 3 ### questions');
  const n = words(md);
  if (n < MIN_WORDS || n > MAX_WORDS) errors.push(`length must be ${MIN_WORDS}-${MAX_WORDS} words (is ${n})`);
  const all = `${d.title}\n${d.metaTitle}\n${d.metaDescription}\n${md}`;
  for (const re of BANNED) if (re.test(all)) errors.push(`remove the phrase matching ${re}`);
  if (STATS.test(all)) errors.push("remove every percentage / statistic - none can be verified");
  if (/<\/?[a-z][^>]*>/i.test(md)) errors.push("no raw HTML, markdown only");
  for (const [, href] of md.matchAll(/\]\(([^)]+)\)/g)) {
    if (!href.startsWith("/") || !sitePaths.includes(href.replace(/[#?].*$/, "").replace(/\/$/, "") || "/")) errors.push(`link ${href} is not a page on this site`);
  }
  const lowerKw = keyword.toLowerCase().split(" ").filter((w) => w.length > 3);
  const intro = md.split(/\s+/).slice(0, 120).join(" ").toLowerCase();
  if (lowerKw.length && lowerKw.filter((w) => intro.includes(w)).length < Math.ceil(lowerKw.length / 2)) errors.push("mention the main topic in the first 100 words");
  return errors;
}

const SYSTEM = (facts) => `You write for the EzzySync blog. Readers are owners and sales staff of Indian travel agencies, tour operators and DMCs.
Write like an experienced Indian travel-business operator explaining things to a peer: concrete, practical, specific to India (WhatsApp, GST, UPI, advance/balance payments, Goa/Kerala/Kashmir/Dubai/Bali packages), short paragraphs, plain words.
Rules you never break:
- Only state product facts that appear in PRODUCT FACTS below. Never invent features, integrations, customers, reviews, awards or rankings.
- No statistics, percentages or "studies show". Use worked examples with realistic rupee amounts instead.
- The post must be useful even to someone who never buys EzzySync. Mention EzzySync naturally, at most 3-4 times, where it genuinely solves the step being discussed.
- No filler intros, no "In today's...", no summary-of-the-summary conclusion.
- Markdown only: ## and ### headings, lists, tables, **bold**. Links only to site paths you are given.

PRODUCT FACTS:
${facts}`;

function prompt(topic, sitePaths, existing, errors) {
  return `Write a blog post.
Main keyword: "${topic.keyword}"
Also answer: ${(topic.also_covers || []).join("; ") || "-"}
Working title: ${topic.working_title}
Angle: ${topic.angle}

Structure:
- Opening paragraph (2-4 sentences) that states the problem and what the reader will be able to do after reading. Use the main keyword naturally in the first 100 words.
- 4 to 7 ## sections with practical steps, examples, templates or checklists a travel agency can use this week. Use ### sub-sections where helpful. A table where it helps comparison.
- A "## Frequently asked questions" section with 3-5 ### questions real agency owners ask about this topic, each answered in 2-4 sentences.
- ${MIN_WORDS}-${MAX_WORDS} words in total.
- Link 2-4 times to the most relevant of these site pages (use the exact path): ${sitePaths.filter((p) => !p.startsWith("/blog/")).join(", ")}
- It may link to at most 2 related existing posts: ${existing.map((p) => `/blog/${p.slug}`).join(", ")}

Return JSON:
{"slug":"kebab-case-from-the-keyword","title":"H1 title, natural, contains the keyword","metaTitle":"30-60 chars","metaDescription":"110-158 chars, says what the reader gets","category":"Guide|Sales|Operations|WhatsApp|Marketing|Finance","excerpt":"1-2 sentences for the blog index","markdown":"the full post body"}
${errors ? `\nYour previous draft was rejected. Fix ALL of these and return the complete post again:\n- ${errors.join("\n- ")}` : ""}`;
}

export default async function writeStep(ctx) {
  const plan = ctx.postPlan || [];
  if (!plan.length) {
    ctx.summary.push("Blog posts: nothing planned this week");
    return;
  }
  const facts = await readText("seo/product-facts.md");
  const existing = await existingPosts();
  const takenSlugs = new Set(existing.map((p) => p.slug));
  const byKeyword = new Map(ctx.keywords.rows.map((r) => [r.keyword, r]));
  ctx.report.posts = [];
  ctx.report.skippedPosts = [];

  for (const topic of plan) {
    let draft, errors;
    for (let attempt = 0; attempt < 2; attempt++) {
      draft = await askJson({ system: SYSTEM(facts), prompt: prompt(topic, ctx.sitePaths, existing, errors), temperature: 0.6 });
      errors = validate(draft, { sitePaths: ctx.sitePaths, takenSlugs, keyword: topic.keyword });
      if (!errors.length) break;
    }
    if (errors.length) {
      ctx.report.skippedPosts.push({ keyword: topic.keyword, errors });
      continue;
    }

    const stamp = today();
    const front = [
      "---",
      `title: ${draft.title}`,
      `metaTitle: ${draft.metaTitle}`,
      `metaDescription: ${draft.metaDescription}`,
      `keyword: ${topic.keyword}`,
      `category: ${draft.category || "Guide"}`,
      `excerpt: ${draft.excerpt || ""}`,
      `date: ${stamp}`,
      "---",
      "",
    ].join("\n");
    await writeText(`content/blog/${draft.slug}.md`, front + draft.markdown.trim() + "\n");
    takenSlugs.add(draft.slug);
    ctx.sitePaths.push(`/blog/${draft.slug}`);

    for (const k of [topic.keyword, ...(topic.also_covers || [])]) {
      const row = byKeyword.get(k);
      if (row) Object.assign(row, { status: "live", target_url: `/blog/${draft.slug}`, content_type: "blog", published_at: stamp, updated_at: stamp });
    }
    // Sentences that make product claims - listed in the PR for a quick fact check.
    const claims = draft.markdown
      .split(/(?<=[.!?])\s+/)
      .filter((s) => /ezzysync/i.test(s))
      .map((s) => s.replace(/\s+/g, " ").trim());
    ctx.report.posts.push({ slug: draft.slug, title: draft.title, keyword: topic.keyword, words: words(draft.markdown), claims });
  }
  ctx.summary.push(`Blog posts: ${ctx.report.posts.length} written${ctx.report.skippedPosts.length ? `, ${ctx.report.skippedPosts.length} skipped (failed checks)` : ""}`);
}
