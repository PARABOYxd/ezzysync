import { askJson } from "./lib/llm.mjs";
import { existingPosts, similarity, today } from "./lib/files.mjs";
import { guessIntent } from "./gsc.mjs";

/**
 * Step 3 - decide what to do with open keywords.
 * For every "idea" / "planned" keyword (and tracked informational queries
 * that only rank on a generic page) the model picks one of:
 *   map    - an existing page already answers it -> status live, target set
 *   write  - worth a new blog post (at most POSTS_PER_WEEK are chosen)
 *   ignore - off-topic (e.g. a traveller planning a holiday, not an agency)
 * Chosen topics land on ctx.postPlan for the writing step.
 */

const POSTS_PER_WEEK = Number(process.env.SEO_POSTS_PER_WEEK || 3);
const MAX_CANDIDATES = 60;

const SYSTEM = `You are the SEO lead for EzzySync, a B2B travel CRM sold to Indian travel agencies, tour operators, DMCs and independent travel consultants.
Our readers are travel business owners and their sales staff - never travellers planning their own trip.
You pick keywords that can bring those business readers, and you never pick two pieces of content for the same search intent.
Answer with JSON only.`;

export default async function planStep(ctx) {
  const posts = await existingPosts();
  const rows = ctx.keywords.rows;
  const genericPages = new Set(["/", "/features", "/solutions", "/blog", "/pricing"]);

  const candidates = rows
    .filter((r) =>
      r.status === "idea" ||
      r.status === "planned" ||
      (r.status === "tracking" && ["informational", "problem"].includes(r.search_intent) && genericPages.has(r.target_url)))
    .slice(0, MAX_CANDIDATES);
  if (!candidates.length) {
    ctx.summary.push("Planning: no open keywords this week");
    return;
  }

  const pages = [...new Set([...ctx.sitePaths])].filter((p) => !p.startsWith("/blog/"));
  const pillarPublished = (k) => rows.some((r) => r.keyword === k && r.status === "live" && r.target_url);
  const roleOf = (r) =>
    r.content_type === "pillar" ? "pillar"
      : r.cluster ? `cluster of "${r.cluster}" (pillar ${pillarPublished(r.cluster) ? "published" : "not yet published"})`
      : "-";
  const prompt = `Existing pages (non-blog): ${pages.join(", ")}
Existing blog posts:
${posts.map((p) => `- /blog/${p.slug}: ${p.title}`).join("\n")}

Candidate keywords (keyword | intent | status | impressions | role):
${candidates.map((r) => `- ${r.keyword} | ${r.search_intent} | ${r.status} | ${r.gsc_impressions || 0} | ${roleOf(r)}`).join("\n")}

Topic clusters: a "pillar" is the broad, complete guide on a topic; a "cluster" post answers one narrower question and links back to its pillar.
When choosing this week's posts, prefer in this order: (1) a pillar that has no post yet, (2) cluster posts whose pillar is already published, (3) anything else worth writing. Don't pick a cluster post before its pillar is published unless you also pick that pillar this week.

For EVERY candidate return a decision:
- "map" if an existing page or post above already answers that search well - give its path as target_url.
- "write" if a new, genuinely useful blog post for travel business owners would answer it and nothing above covers it.
- "ignore" if the searcher is a traveller, a job seeker, a student, or otherwise not a travel business owner/staff, or the keyword is too vague.
Then choose at most ${POSTS_PER_WEEK} of the "write" keywords to publish THIS week: the ones most likely to bring travel agency owners who could buy a CRM, and not overlapping each other. Several "write" keywords with the same intent should be merged into one post (list them in also_covers).

Return:
{"decisions":[{"keyword":"...","action":"map|write|ignore","target_url":"/path or empty","reason":"max 12 words"}],
 "this_week":[{"keyword":"...","also_covers":["..."],"working_title":"...","angle":"what the post teaches and for whom, 1-2 sentences"}]}`;

  const plan = await askJson({ system: SYSTEM, prompt, temperature: 0.2 });
  const byKeyword = new Map(rows.map((r) => [r.keyword, r]));
  const stamp = today();
  const counts = { map: 0, write: 0, ignore: 0 };

  for (const d of plan.decisions || []) {
    const row = byKeyword.get(d.keyword);
    if (!row || !["map", "write", "ignore"].includes(d.action)) continue;
    // Pillar/cluster topics are an editorial plan - the model can schedule
    // them but not drop or re-point them.
    if (row.cluster) continue;
    counts[d.action]++;
    row.updated_at = stamp;
    row.notes = d.reason || row.notes;
    if (d.action === "map" && d.target_url && ctx.sitePaths.includes(d.target_url)) {
      Object.assign(row, { status: row.status === "tracking" ? "tracking" : "live", target_url: d.target_url });
    } else if (d.action === "write") {
      row.status = "planned";
    } else if (d.action === "ignore") {
      row.status = "ignore";
    }
  }

  // Guard against cannibalising an existing post, whatever the model said:
  // compare with the keywords each post already targets (keywords.csv rows
  // pointing at /blog/..., plus markdown posts' own keyword).
  // Same words with a different intent ("what is travel crm" vs "best travel
  // crm") are different searches, so a clash needs both.
  const intentOf = (k) => byKeyword.get(k)?.search_intent || guessIntent(k);
  const covered = [
    ...rows.filter((r) => r.target_url?.startsWith("/blog/") && ["live", "tracking"].includes(r.status)).map((r) => r.keyword),
    ...posts.map((p) => p.keyword).filter(Boolean),
  ];
  ctx.postPlan = (plan.this_week || [])
    .filter((t) => byKeyword.has(t.keyword))
    .filter((t) => {
      const clash = covered.find((k) => intentOf(k) === intentOf(t.keyword) && similarity(t.keyword, k) >= 0.6);
      if (clash) ctx.summary.push(`Planning: skipped "${t.keyword}" - an existing post already targets "${clash}"`);
      return !clash;
    })
    .slice(0, POSTS_PER_WEEK);

  // Until every pillar exists, each week writes at least one of them.
  const nextPillar = rows.find((r) => r.content_type === "pillar" && r.status === "planned");
  const hasPillar = ctx.postPlan.some((t) => byKeyword.get(t.keyword)?.content_type === "pillar");
  if (nextPillar && !hasPillar) {
    ctx.postPlan = [
      { keyword: nextPillar.keyword, also_covers: [], working_title: nextPillar.keyword, angle: "The complete, practical guide on this topic for Indian travel agency owners." },
      ...ctx.postPlan,
    ].slice(0, POSTS_PER_WEEK);
  }

  ctx.summary.push(`Planning: ${counts.map} mapped to existing pages, ${counts.write} worth a post, ${counts.ignore} ignored; ${ctx.postPlan.length} posts to write this week`);
}
