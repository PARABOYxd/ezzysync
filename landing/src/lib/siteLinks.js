import { featurePages, solutionPages } from "@/content/seoPages";
import { getPost } from "@/lib/blog";
import internalLinks from "@/content/internalLinks.json";

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
  if (section === "blog") return getPost(slug)?.title;
  return undefined;
}

/**
 * Keyword -> page map (content/internalLinks.json). Blog posts link to the
 * pages whose phrases they mention; markdown posts also get inline links.
 * The weekly SEO job adds entries for keywords that are close to page 1.
 */
export const keywordLinks = [...internalLinks].sort((a, b) => b.phrase.length - a.phrase.length);

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
