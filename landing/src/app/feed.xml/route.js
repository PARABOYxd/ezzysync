import { getAllPosts } from "@/lib/blog";
import { SITE_URL } from "@/lib/siteLinks";

/**
 * /feed.xml - RSS 2.0 feed of the blog, built from the same post list as
 * the blog index and the sitemap, so a new post appears here on the next
 * build. Feed readers and the directories that accept a feed URL pick up
 * new posts from it without anyone submitting them.
 */
export const dynamic = "force-static";

const esc = (s = "") => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function GET() {
  const posts = getAllPosts();
  const items = posts
    .map((p) => {
      const url = `${SITE_URL}/blog/${p.slug}`;
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(p.isoDate).toUTCString()}</pubDate>
      <category>${esc(p.category)}</category>
      <description>${esc(p.metaDescription || p.excerpt)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>EzzySync Blog</title>
    <link>${SITE_URL}/blog</link>
    <description>Practical guides for Indian travel agencies: WhatsApp leads, itineraries, GST invoicing and running a tour business.</description>
    <language>en-IN</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${posts[0] ? `    <lastBuildDate>${new Date(posts[0].isoUpdated || posts[0].isoDate).toUTCString()}</lastBuildDate>\n` : ""}${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
