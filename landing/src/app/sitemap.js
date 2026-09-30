import { getAllPosts } from "@/lib/blog";
import { overrideDate } from "@/lib/seoOverrides";
import { featurePages, solutionPages } from "@/content/seoPages";
import { comparePages } from "@/content/comparePages";
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
  // The CRM's sign-in page, served on this host through the /app proxy
  // (see ../../../vercel.json). Declared here rather than in a second
  // sitemap on app.ezzysync.com: that host is noindex, and a sitemap served
  // from one host listing another host's URLs is ignored by Google.
  // /app/register is left out: the CRM's index.html canonicalises every
  // route to /app/login, and a sitemap should only list canonical URLs.
  { path: "/app/login", updated: "2026-07-29", priority: 0.3 },
];

// Date the /features/* and /solutions/* content in content/seoPages.js last changed.
const SEO_PAGES_UPDATED = "2026-09-24";
// Date the /compare/* content in content/comparePages.js last changed.
const COMPARE_PAGES_UPDATED = "2026-09-24";

const toIso = (d) => new Date(d).toISOString();
// A title/description rewrite by the weekly job counts as a change.
const latest = (path, ...dates) => toIso([...dates, overrideDate(path)].filter(Boolean).sort((a, b) => new Date(b) - new Date(a))[0]);

export default function sitemap() {
  return [
    ...staticPages.map(({ path, updated, priority }) => ({
      url: `${SITE_URL}${path}`,
      lastModified: latest(path || "/", updated),
      priority,
    })),
    ...featurePages.map((p) => ({
      url: `${SITE_URL}/features/${p.slug}`,
      lastModified: latest(`/features/${p.slug}`, SEO_PAGES_UPDATED),
      priority: 0.8,
    })),
    ...solutionPages.map((p) => ({
      url: `${SITE_URL}/solutions/${p.slug}`,
      lastModified: latest(`/solutions/${p.slug}`, SEO_PAGES_UPDATED),
      priority: 0.8,
    })),
    ...comparePages.map((p) => ({
      url: `${SITE_URL}/compare/${p.slug}`,
      lastModified: latest(`/compare/${p.slug}`, COMPARE_PAGES_UPDATED),
      priority: 0.8,
    })),
    ...getAllPosts().map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: latest(`/blog/${p.slug}`, p.isoUpdated || p.isoDate),
      priority: 0.7,
    })),
  ];
}
