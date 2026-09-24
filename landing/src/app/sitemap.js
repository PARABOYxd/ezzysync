import { articlesData } from "@/content/blogArticles";
import { featurePages, solutionPages } from "@/content/seoPages";
import { SITE_URL } from "@/lib/siteLinks";

/**
 * Built from the same data the pages render from, so a new blog post,
 * feature page or solution page is in the sitemap on the next build.
 *
 * `lastModified` should only move when a page's content really changes -
 * Google stops trusting lastmod on sites where it changes every deploy.
 * Bump the date here when you edit one of these pages.
 */
const staticPages = [
  { path: "", updated: "2026-09-24", priority: 1.0 },
  { path: "/free-itinerary-builder", updated: "2026-09-11", priority: 0.9 },
  { path: "/features", updated: "2026-09-24", priority: 0.9 },
  { path: "/solutions", updated: "2026-09-24", priority: 0.8 },
  { path: "/pricing", updated: "2026-09-24", priority: 0.9 },
  { path: "/compare/telecrm", updated: "2026-09-01", priority: 0.8 },
  { path: "/compare/zoho", updated: "2026-09-01", priority: 0.8 },
  { path: "/about", updated: "2026-09-24", priority: 0.6 },
  { path: "/contact", updated: "2026-09-11", priority: 0.7 },
  { path: "/blog", updated: "2026-09-11", priority: 0.7 },
  { path: "/terms", updated: "2026-08-01", priority: 0.2 },
  { path: "/privacy", updated: "2026-08-01", priority: 0.2 },
  { path: "/refund-policy", updated: "2026-08-01", priority: 0.2 },
];

// Date the /features/* and /solutions/* content in content/seoPages.js last changed.
const SEO_PAGES_UPDATED = "2026-09-24";

const toIso = (d) => new Date(d).toISOString();

export default function sitemap() {
  return [
    ...staticPages.map(({ path, updated, priority }) => ({
      url: `${SITE_URL}${path}`,
      lastModified: toIso(updated),
      priority,
    })),
    ...featurePages.map((p) => ({
      url: `${SITE_URL}/features/${p.slug}`,
      lastModified: toIso(SEO_PAGES_UPDATED),
      priority: 0.8,
    })),
    ...solutionPages.map((p) => ({
      url: `${SITE_URL}/solutions/${p.slug}`,
      lastModified: toIso(SEO_PAGES_UPDATED),
      priority: 0.8,
    })),
    ...Object.entries(articlesData).map(([slug, a]) => ({
      url: `${SITE_URL}/blog/${slug}`,
      lastModified: toIso(a.updated || a.date),
      priority: 0.7,
    })),
  ];
}
