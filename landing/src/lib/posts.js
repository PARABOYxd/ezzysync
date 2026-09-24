import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";
import internalLinks from "@/content/internalLinks.json";

/**
 * Markdown blog posts in landing/content/blog/<slug>.md - the format the
 * weekly SEO job writes new posts in. The older hand-built posts stay in
 * content/blogArticles.js; both are served by /blog/[slug].
 *
 * Frontmatter is one `key: value` per line between --- fences:
 *   title, metaTitle, metaDescription, keyword, category, date (YYYY-MM-DD),
 *   updated, excerpt, image (all optional)
 * A "## Frequently asked questions" section with ### questions becomes
 * FAQPage schema automatically.
 */

const POSTS_DIR = path.join(process.cwd(), "content", "blog");
const MAX_INLINE_LINKS = 5;

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    data[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return { data, body: m[2] };
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Links the first mention of each internalLinks phrase to its page. Never
 * touches headings, quotes, tables or text that is already a link; skips the
 * post's own URL and links each page at most once.
 */
function addInternalLinks(body, selfPath) {
  const used = new Set([selfPath]);
  let count = 0;
  const lines = body.split("\n");
  // Longest phrases first so "travel agency crm" wins over "crm".
  const entries = [...internalLinks].sort((a, b) => b.phrase.length - a.phrase.length);
  for (const { phrase, href } of entries) {
    if (count >= MAX_INLINE_LINKS) break;
    if (used.has(href)) continue;
    const re = new RegExp(`\\b(${escapeRe(phrase)}(?:s|es)?)\\b`, "i");
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*(#|>|\|)/.test(lines[i])) continue;
      // Odd segments are existing [text](url) links - leave them alone.
      const parts = lines[i].split(/(\[[^\]]*\]\([^)]*\))/);
      const j = parts.findIndex((part, k) => k % 2 === 0 && re.test(part));
      if (j === -1) continue;
      parts[j] = parts[j].replace(re, `[$1](${href})`);
      lines[i] = parts.join("");
      used.add(href);
      count++;
      break;
    }
  }
  return lines.join("\n");
}

function extractFaqs(body) {
  const section = body.split(/^##\s+(?:faq|frequently asked questions)\s*$/im)[1];
  if (!section) return [];
  const until = section.split(/^##\s/m)[0];
  return [...until.matchAll(/^###\s+(.+)\r?\n([\s\S]*?)(?=^###\s|$(?![\s\S]))/gm)]
    .map(([, q, a]) => ({ q: q.trim(), a: a.replace(/\s+/g, " ").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim() }))
    .filter((f) => f.a);
}

const displayDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

function loadPost(file) {
  const slug = file.replace(/\.md$/, "");
  const { data, body } = parseFrontmatter(fs.readFileSync(path.join(POSTS_DIR, file), "utf8"));
  const words = body.split(/\s+/).filter(Boolean).length;
  const firstPara = body.split(/\n\s*\n/).find((p) => p.trim() && !p.trim().startsWith("#")) || "";
  return {
    slug,
    title: data.title,
    metaTitle: data.metaTitle || data.title,
    metaDescription: data.metaDescription || "",
    keyword: data.keyword || "",
    // Optional cover, e.g. /images/blog/x.jpg - used as the banner, card thumbnail and share image.
    image: data.image || undefined,
    category: data.category || "Guide",
    isoDate: data.date,
    date: displayDate(data.date),
    updated: data.updated ? displayDate(data.updated) : undefined,
    isoUpdated: data.updated || undefined,
    readTime: `${Math.max(1, Math.round(words / 200))} min read`,
    excerpt: data.excerpt || firstPara.replace(/[*_`[\]]|\([^)]*\)/g, "").slice(0, 180),
    faqs: extractFaqs(body),
    html: marked.parse(addInternalLinks(body, `/blog/${slug}`)),
  };
}

let cache;
/** All markdown posts, newest first. */
export function getMarkdownPosts() {
  if (cache) return cache;
  if (!fs.existsSync(POSTS_DIR)) return (cache = []);
  cache = fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map(loadPost)
    .filter((p) => p.title && p.isoDate)
    .sort((a, b) => b.isoDate.localeCompare(a.isoDate));
  return cache;
}

export const getMarkdownPost = (slug) => getMarkdownPosts().find((p) => p.slug === slug);
