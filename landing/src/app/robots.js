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
        // AI search and assistant crawlers, named explicitly so a future
        // catch-all block can't silently drop us from AI answers.
        // OAI-SearchBot is the one that builds ChatGPT Search's index;
        // GPTBot alone does not get pages cited there.
        userAgent: [
          "OAI-SearchBot", "GPTBot", "ChatGPT-User",
          "ClaudeBot", "Claude-SearchBot", "Claude-User", "anthropic-ai",
          "PerplexityBot", "Perplexity-User",
          "Google-Extended", "Bingbot",
          "Applebot", "Applebot-Extended",
          "DuckAssistBot", "Meta-ExternalAgent", "Amazonbot", "MistralAI-User",
        ],
        allow: "/",
        disallow: PRIVATE,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
