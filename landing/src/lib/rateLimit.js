/**
 * Tiny in-memory rate limiter for the public API routes.
 *
 * /api/generate-itinerary calls a paid LLM with no login in front of it, so
 * without a limit anyone can run up the bill with a loop. In-memory means each
 * serverless instance counts separately: it stops a casual loop, not a
 * distributed attack (put a WAF rule or Upstash in front for that).
 */
const buckets = new Map();

/** Caller IP from the proxy headers Vercel / Railway set. */
export function clientIp(req) {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : req.headers.get("x-real-ip") || "unknown").trim();
}

/**
 * @returns {{ ok: boolean, retryAfter: number }} ok=false once `limit` calls
 * were made within `windowMs`; retryAfter is in seconds.
 */
export function rateLimit(key, { limit, windowMs }) {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { ok: false, retryAfter: Math.max(1, Math.ceil((windowMs - (now - hits[0])) / 1000)) };
  }
  hits.push(now);
  buckets.set(key, hits);
  // keep the map from growing forever
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
  return { ok: true, retryAfter: 0 };
}
