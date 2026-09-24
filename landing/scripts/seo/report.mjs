/** Builds the weekly report - it becomes the pull request description. */

const pct = (a, b) => (b ? `${a >= b ? "+" : ""}${Math.round(((a - b) / b) * 100)}%` : "–");
const p1 = (x) => `${(x * 100).toFixed(1)}%`;

function table(head, rows) {
  if (!rows.length) return "_None this week._";
  return [`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");
}

export function buildReport(ctx) {
  const r = ctx.report;
  const out = [`# SEO weekly report — ${ctx.date}`, ""];

  out.push("## What the job did", "", ...ctx.summary.map((s) => `- ${s}`), "");
  if (ctx.errors.length) out.push("**Steps that failed** (the rest still ran):", "", ...ctx.errors.map((e) => `- ${e}`), "");

  out.push(
    "## Before you merge",
    "",
    "1. Open each new blog post under **Files changed** and read the “Product claims” listed below — every one must be true today.",
    "2. Skim the new titles/descriptions.",
    "3. Merge. The site redeploys and search engines are notified automatically.",
    "",
    "If something is wrong, edit the file in this PR (or delete the post file) before merging.",
    "",
  );

  if (ctx.gsc) {
    const { now, before } = ctx.gsc.totals;
    out.push(
      "## Last 28 days",
      "",
      table(["", "Now", "Before", "Change"], [
        ["Clicks", now.clicks, before.clicks, pct(now.clicks, before.clicks)],
        ["Impressions", now.impressions, before.impressions, pct(now.impressions, before.impressions)],
        ["CTR", p1(now.ctr), p1(before.ctr), ""],
        ["Avg. position", now.position.toFixed(1), before.position.toFixed(1), ""],
      ]),
      "",
    );
  }

  if (r.posts?.length) {
    out.push("## New blog posts", "");
    for (const p of r.posts) {
      out.push(`### ${p.title}`, `\`/blog/${p.slug}\` · keyword “${p.keyword}” · ${p.words} words`, "", "Product claims to check:");
      out.push(...(p.claims.length ? p.claims.map((c) => `- ${c}`) : ["- _(none)_"]), "");
    }
  }
  if (r.skippedPosts?.length) {
    out.push("### Posts not published (failed quality checks)", "", ...r.skippedPosts.map((s) => `- **${s.keyword}**: ${s.errors.slice(0, 3).join("; ")}`), "");
  }

  if (r.metaChanges?.length) {
    out.push("## Title rewrites (4-week test)", "", table(["Page", "Old title", "New title", "Why"], r.metaChanges.map((m) => [m.path, m.from, m.to, m.reason])), "");
  }
  if (r.metaResults?.length) {
    out.push("## Title tests finished", "", table(["Page", "CTR before", "CTR after", "Result"], r.metaResults.map((m) => [m.path, p1(m.before), p1(m.after), m.outcome])), "");
  }
  if (r.newLinks?.length) {
    out.push("## New internal links", "", table(["Phrase", "Links to", "Why"], r.newLinks.map((l) => [l.phrase, l.href, l.reason])), "");
  }

  if (ctx.gsc) {
    const losing = ctx.gsc.pages
      .filter((p) => p.prev.clicks >= 5 && p.clicks < p.prev.clicks * 0.7)
      .sort((a, b) => a.clicks / a.prev.clicks - b.clicks / b.prev.clicks);
    const gaining = ctx.gsc.pages.filter((p) => p.clicks >= 3 && p.clicks > p.prev.clicks * 1.3).sort((a, b) => b.clicks - a.clicks);
    out.push("## Pages losing traffic", "", table(["Page", "Clicks", "Change"], losing.slice(0, 10).map((p) => [p.path, `${p.prev.clicks} → ${p.clicks}`, pct(p.clicks, p.prev.clicks)])), "");
    out.push("## Pages gaining traffic", "", table(["Page", "Clicks", "Change"], gaining.slice(0, 10).map((p) => [p.path, `${p.prev.clicks} → ${p.clicks}`, pct(p.clicks, p.prev.clicks)])), "");
    if (r.striking?.length) {
      out.push("## Almost on page 1", "", table(["Query", "Position", "Impressions", "Page"], r.striking.map((q) => [q.q, q.position.toFixed(1), q.impressions, q.topPage])), "");
    }
    const top = [...ctx.gsc.byQuery.values()].sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions).slice(0, 15);
    out.push("## Top searches", "", table(["Query", "Clicks", "Impressions", "Position", "Page"], top.map((q) => [q.q, q.clicks, q.impressions, q.position.toFixed(1), q.topPage])), "");
  }

  const newKw = [...(r.newGscKeywords || []).map((k) => `${k.q} _(search console)_`), ...(r.newIdeas || []).map((k) => `${k} _(google suggest)_`)];
  if (newKw.length) out.push(`## Keywords added to seo/keywords.csv (${newKw.length})`, "", ...newKw.slice(0, 30).map((k) => `- ${k}`), "");

  return out.join("\n");
}
