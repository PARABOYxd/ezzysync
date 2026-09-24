import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

/** Paths are relative to the landing/ folder. */
export const ROOT = new URL("../../../", import.meta.url);
export const at = (p) => new URL(p, ROOT);

export const today = () => new Date().toISOString().slice(0, 10);
export const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
export const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

export const readJson = async (p, fallback) => (existsSync(at(p)) ? JSON.parse(await readFile(at(p), "utf8")) : fallback);
export const writeJson = (p, data) => writeFile(at(p), JSON.stringify(data, null, 2) + "\n");
export const readText = (p) => readFile(at(p), "utf8");
export async function writeText(p, text) {
  await mkdir(new URL(".", at(p)), { recursive: true });
  await writeFile(at(p), text);
}

// ---------- seo/keywords.csv ----------

const BASE_COLS = ["keyword", "search_intent", "volume", "difficulty", "country", "target_url", "content_type", "status", "published_at", "updated_at"];
const EXTRA_COLS = ["source", "gsc_impressions", "gsc_clicks", "gsc_ctr", "gsc_position", "gsc_updated", "notes"];

/** Keyword text safe to store in the CSV (no commas, quotes or newlines). */
export const cleanKeyword = (s) => String(s).replace(/[",\r\n]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
const cleanCell = (v) => String(v ?? "").replace(/[",\r\n]/g, " ").trim();

export async function readKeywords() {
  const [header, ...lines] = (await readText("seo/keywords.csv")).trim().split(/\r?\n/);
  const fileCols = header.split(",");
  const cols = [...new Set([...BASE_COLS, ...fileCols, ...EXTRA_COLS])];
  const rows = lines.filter(Boolean).map((l) => Object.fromEntries(l.split(",").map((v, i) => [fileCols[i], v])));
  return { cols, rows };
}

export const writeKeywords = ({ cols, rows }) =>
  writeText("seo/keywords.csv", [cols.join(","), ...rows.map((r) => cols.map((c) => cleanCell(r[c])).join(","))].join("\n") + "\n");

// ---------- what already exists on the site ----------

/** Every blog slug (hand-built JSX posts and markdown posts) with its title and keyword. */
export async function existingPosts() {
  const posts = [];
  const jsx = await readText("src/content/blogArticles.js");
  for (const m of jsx.matchAll(/^ {2}"([a-z0-9-]+)": \{\s*\n\s*title: "([^"]+)"/gm)) posts.push({ slug: m[1], title: m[2], keyword: "" });
  if (existsSync(at("content/blog"))) {
    for (const f of await readdir(at("content/blog"))) {
      if (!f.endsWith(".md")) continue;
      const text = await readText(`content/blog/${f}`);
      posts.push({
        slug: f.replace(/\.md$/, ""),
        title: text.match(/^title:\s*(.+)$/m)?.[1] || "",
        keyword: text.match(/^keyword:\s*(.+)$/m)?.[1] || "",
      });
    }
  }
  return posts;
}

/** Paths in the live sitemap, e.g. ["/", "/pricing", "/blog/x"]. */
export async function sitemapPaths(site) {
  const xml = await (await fetch(`${site}/sitemap.xml`)).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname.replace(/\/$/, "") || "/");
}

/** Current <title> and meta description of a live page. */
export async function livePageMeta(site, path) {
  const html = await (await fetch(site + path)).text();
  const pick = (re) => (html.match(re)?.[1] || "").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').trim();
  return {
    title: pick(/<title[^>]*>([^<]*)<\/title>/i),
    description: pick(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i),
    h1: pick(/<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, ""),
  };
}

// ---------- similarity, to avoid two pages chasing the same search ----------

const STOP = new Set("a an the for to of in on and or with how what is are your you best top vs guide software tool tools india indian 2026 2027".split(" "));
const tokens = (s) => new Set(cleanKeyword(s).split(/[^a-z0-9]+/).filter((w) => w && !STOP.has(w)).map((w) => w.replace(/(ies|es|s)$/, "")));
/** Jaccard overlap of meaningful words: 1 = same topic words, 0 = nothing shared. */
export function similarity(a, b) {
  const x = tokens(a), y = tokens(b);
  if (!x.size || !y.size) return 0;
  const inter = [...x].filter((w) => y.has(w)).length;
  return inter / (x.size + y.size - inter);
}
