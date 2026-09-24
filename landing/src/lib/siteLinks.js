import { featurePages, solutionPages } from "@/content/seoPages";
import { articlesData } from "@/content/blogArticles";

export const SITE_URL = "https://www.ezzysync.com";

/** Human label for any internal path, used wherever we render a link list. */
const staticLabels = {
  "/": "Home",
  "/features": "All features",
  "/solutions": "Who it's for",
  "/pricing": "Pricing",
  "/free-itinerary-builder": "Free itinerary builder",
  "/compare/zoho": "EzzySync vs Zoho CRM",
  "/compare/telecrm": "EzzySync vs TeleCRM",
  "/blog": "Blog",
  "/about": "About",
  "/contact": "Contact sales",
};

export function linkLabel(path) {
  if (staticLabels[path]) return staticLabels[path];
  const [, section, slug] = path.split("/");
  if (section === "features") return featurePages.find((p) => p.slug === slug)?.label;
  if (section === "solutions") return `For ${solutionPages.find((p) => p.slug === slug)?.label.toLowerCase()}`;
  if (section === "blog") return articlesData[slug]?.title;
  return undefined;
}

/**
 * Keyword -> page map for automatic internal linking. When a blog post's
 * title or description mentions a phrase, the post links to that page.
 * Longer, more specific phrases first. Keep one target per phrase.
 */
export const keywordLinks = [
  { phrase: "tour operator", href: "/solutions/tour-operators" },
  { phrase: "dmc", href: "/solutions/tour-operators" },
  { phrase: "itinerary", href: "/features/itinerary-builder" },
  { phrase: "whatsapp", href: "/features/whatsapp-automation" },
  { phrase: "follow-up", href: "/features/follow-up-automation" },
  { phrase: "follow up", href: "/features/follow-up-automation" },
  { phrase: "lead", href: "/features/lead-management" },
  { phrase: "instagram", href: "/features/lead-management" },
  { phrase: "billing", href: "/features/booking-management" },
  { phrase: "invoice", href: "/features/booking-management" },
  { phrase: "booking", href: "/features/booking-management" },
  { phrase: "gst", href: "/features/booking-management" },
  { phrase: "crm", href: "/solutions/travel-agencies" },
];

/** Product pages relevant to a piece of text, most specific match first. */
export function pagesForText(text, limit = 3) {
  const haystack = text.toLowerCase();
  const out = [];
  for (const { phrase, href } of keywordLinks) {
    if (haystack.includes(phrase) && !out.includes(href)) out.push(href);
    if (out.length === limit) break;
  }
  return out;
}
