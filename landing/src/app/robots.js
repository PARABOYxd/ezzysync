import { SITE_URL } from "@/lib/siteLinks";

// /api/* is the itinerary generator backend. /app/* (the CRM, proxied by
// vercel.json) is deliberately NOT disallowed here: it is kept out of the
// index with an X-Robots-Tag: noindex header, which crawlers can only see
// if they are allowed to fetch the URL.
const PRIVATE = ["/api/"];

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE,
      },
      {
        userAgent: ["GPTBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "anthropic-ai", "PerplexityBot", "Perplexity-User", "Google-Extended", "Bingbot"],
        allow: "/",
        disallow: PRIVATE,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
