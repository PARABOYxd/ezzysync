import { cleanKeyword, today } from "./lib/files.mjs";
import { guessIntent } from "./gsc.mjs";

/**
 * Step 2 - keyword ideas the site doesn't rank for yet.
 * Asks Google's search-box suggestions (what people actually type) for our
 * seed topics and adds business-relevant ones to keywords.csv as "idea".
 * The planning step later decides which ideas deserve a post and marks the
 * off-topic ones "ignore".
 */

const SEEDS = [
  "travel crm", "travel agency software", "tour operator software", "travel agency crm",
  "itinerary builder for travel agents", "whatsapp for travel agency", "travel agency leads",
  "how to start a travel agency", "travel agency business", "travel quotation", "dmc software",
  "travel agency management", "travel agent follow up", "travel agency gst",
];
const MODIFIERS = ["", "how to ", "best ", "what is "];
const SUFFIXES = ["", " for small business", " in india"];
const MAX_NEW_IDEAS = 40;

// Must look like a travel *business* search, not a traveller planning a trip.
const TRAVEL = /\b(travel|tour|trip|itinerar|holiday|dmc|tourism)/;
const BUSINESS = /\b(crm|software|agency|agencies|agent|agents|operator|operators|business|lead|leads|quotation|quote|invoice|gst|b2b|dmc|management|system|app|tool|whatsapp|booking engine|builder|maker|template|commission|margin|sales|marketing|customers?)\b/;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function suggestions(q) {
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=en&gl=in&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (EzzySync SEO job)" } });
  if (!res.ok) throw new Error(`suggest ${res.status}`);
  const [, list] = JSON.parse(Buffer.from(await res.arrayBuffer()).toString("latin1"));
  return list || [];
}

export default async function suggestStep(ctx) {
  const known = new Set(ctx.keywords.rows.map((r) => r.keyword));
  // Seed from our fixed topics plus the tracked keywords that bring impressions.
  const tracked = ctx.keywords.rows
    .filter((r) => ["live", "tracking"].includes(r.status) && r.search_intent !== "navigational")
    .sort((a, b) => Number(b.gsc_impressions || 0) - Number(a.gsc_impressions || 0))
    .slice(0, 10)
    .map((r) => r.keyword);
  const seeds = [...new Set([...SEEDS, ...tracked])];

  const found = new Map(); // keyword -> how many seed queries returned it
  let failures = 0;
  for (const seed of seeds) {
    for (const q of [...MODIFIERS.map((m) => m + seed), ...SUFFIXES.slice(1).map((s) => seed + s)]) {
      try {
        for (const s of await suggestions(q)) {
          const k = cleanKeyword(s);
          if (k.split(" ").length < 2 || k.length > 80) continue;
          found.set(k, (found.get(k) || 0) + 1);
        }
      } catch {
        failures++;
      }
      await sleep(250);
    }
  }

  const ideas = [...found.entries()]
    .filter(([k]) => !known.has(k) && TRAVEL.test(k) && BUSINESS.test(k))
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_NEW_IDEAS);

  const stamp = today();
  for (const [k, hits] of ideas) {
    ctx.keywords.rows.push({
      keyword: k, search_intent: guessIntent(k), country: "IN", status: "idea", source: "suggest",
      updated_at: stamp, notes: `suggested by ${hits} searches`,
    });
  }
  ctx.summary.push(`Google suggestions: ${ideas.length} new keyword ideas${failures ? ` (${failures} lookups failed)` : ""}`);
  ctx.report.newIdeas = ideas.map(([k]) => k);
}
