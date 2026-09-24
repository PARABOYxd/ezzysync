import { PLANS } from "@/data/plans";
import { SITE_URL } from "@/lib/siteLinks";

/**
 * /pricing.md - plain pricing for AI assistants, built from data/plans.js
 * (itself checked against the backend catalog in CI), so the numbers here
 * are always the ones customers are charged.
 */
export const dynamic = "force-static";

const planSection = (p) =>
  [
    `## ${p.name} — ${p.price}${p.period.startsWith("/") ? p.period : `, ${p.period}`}`,
    p.blurb,
    ...p.features.map((f) => `- ${f}`),
  ].join("\n");

export function GET() {
  const text = `# EzzySync pricing

Every plan starts with a 30-day free trial with full Pro access. No credit card. Cancel or switch plans any time.
Prices in Indian rupees. Full page: ${SITE_URL}/pricing

${PLANS.map(planSection).join("\n\n")}
`;
  return new Response(text, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
