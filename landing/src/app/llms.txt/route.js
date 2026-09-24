import fs from "node:fs";
import path from "node:path";
import { featurePages, solutionPages } from "@/content/seoPages";
import { getAllPosts } from "@/lib/blog";
import { SITE_URL } from "@/lib/siteLinks";

/**
 * /llms.txt - the summary AI assistants (ChatGPT, Perplexity, Claude...)
 * read about the site. Generated at build time from the same sources as
 * the pages, so it can't drift: product facts from seo/product-facts.md,
 * every feature/solution page and every blog post.
 */
export const dynamic = "force-static";

export function GET() {
  const facts = fs.readFileSync(path.join(process.cwd(), "seo", "product-facts.md"), "utf8");
  // Keep the product sections; drop the file's own header and the writer-only "Do NOT claim" list.
  const body = facts.split(/^## /m).slice(1).filter((s) => !s.startsWith("Do NOT claim")).map((s) => `## ${s.trim()}`).join("\n\n");

  const link = (p, label, note) => `- [${label}](${SITE_URL}${p})${note ? `: ${note}` : ""}`;
  const text = `# EzzySync

> Cloud travel CRM for Indian travel agencies, tour operators, DMCs and independent travel consultants: WhatsApp lead inbox, lead pipeline and follow-ups, day-wise itineraries, GST quotations and invoices, bookings, vouchers and payment tracking.

## Main pages
${link("/", "Home")}
${link("/pricing", "Pricing", "plans and free trial")}
${link("/pricing.md", "Pricing (markdown)")}
${link("/features", "All features")}
${link("/free-itinerary-builder", "Free itinerary builder", "no login needed")}
${link("/compare/zoho", "EzzySync vs Zoho CRM")}
${link("/compare/telecrm", "EzzySync vs TeleCRM")}
${link("/contact", "Contact sales")}

## Features
${featurePages.map((p) => link(`/features/${p.slug}`, p.label, p.metaDescription)).join("\n")}

## Who it's for
${solutionPages.map((p) => link(`/solutions/${p.slug}`, p.label, p.metaDescription)).join("\n")}

## Guides
${getAllPosts().map((p) => link(`/blog/${p.slug}`, p.title)).join("\n")}

${body}
`;
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
