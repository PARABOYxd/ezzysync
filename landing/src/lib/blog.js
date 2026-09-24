import { articlesData } from "@/content/blogArticles";
import { getMarkdownPosts, getMarkdownPost } from "@/lib/posts";

/**
 * One list of every blog post, whichever format it is stored in:
 * hand-built JSX posts (content/blogArticles.js) and markdown posts
 * (content/blog/*.md, written by the weekly SEO job). Newest first.
 */
export function getAllPosts() {
  const jsx = Object.entries(articlesData).map(([slug, a]) => ({
    slug,
    source: "jsx",
    title: a.title,
    metaTitle: a.metaTitle || a.title,
    metaDescription: a.metaDescription || "",
    category: a.category,
    date: a.date,
    updated: a.updated,
    // "August 30, 2026" -> parsed as UTC so the date never shifts by timezone.
    isoDate: new Date(`${a.date} UTC`).toISOString().slice(0, 10),
    isoUpdated: a.updated ? new Date(`${a.updated} UTC`).toISOString().slice(0, 10) : undefined,
    readTime: a.readTime,
    image: a.image,
  }));
  const md = getMarkdownPosts().map((p) => ({ ...p, source: "md" }));
  const mdSlugs = new Set(md.map((p) => p.slug));
  return [...md, ...jsx.filter((p) => !mdSlugs.has(p.slug))].sort((a, b) => b.isoDate.localeCompare(a.isoDate));
}

/** Full post for rendering: JSX posts carry `content`, markdown posts carry `html` + `faqs`. */
export function getPost(slug) {
  const md = getMarkdownPost(slug);
  if (md) return { ...md, source: "md" };
  const a = articlesData[slug];
  return a ? { ...a, slug, source: "jsx", metaTitle: a.metaTitle || a.title } : undefined;
}
