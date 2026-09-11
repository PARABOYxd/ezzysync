const logger = require('../utils/logger').child({ module: 'whatsapp_rate' });

/**
 * Paces outbound WhatsApp messages so a linked number behaves like a person.
 *
 * There is no published rate limit to respect here, because this is not an
 * official API - which is exactly why pacing matters. WhatsApp bans on
 * behaviour, and a burst of messages leaving one number faster than anyone
 * could type is the clearest automation signal there is. An agency that loses
 * its number loses its business, so the ceiling is deliberately well under
 * what the socket could actually push.
 *
 * A token bucket rather than a fixed delay: an agent answering five chats in
 * quick succession is normal and should not be slowed down, while a sustained
 * stream is. The bucket refills continuously, so the long-run rate is capped
 * while short bursts pass through untouched.
 */

// Roughly one message every four seconds sustained, with room for a burst of
// ten - close to how a busy human agent actually works.
const SUSTAINED_PER_MINUTE = Number(process.env.WHATSAPP_MAX_MESSAGES_PER_MINUTE) || 15;
const BURST = Number(process.env.WHATSAPP_BURST_SIZE) || 10;

const buckets = new Map(); // tenantId -> { tokens, lastRefill }

function takeToken(tenantId) {
  const now = Date.now();
  let bucket = buckets.get(tenantId);

  if (!bucket) {
    bucket = { tokens: BURST, lastRefill: now };
    buckets.set(tenantId, bucket);
  }

  const elapsedMinutes = (now - bucket.lastRefill) / 60000;
  bucket.tokens = Math.min(BURST, bucket.tokens + elapsedMinutes * SUSTAINED_PER_MINUTE);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { allowed: true, waitMs: 0 };
  }

  // How long until one token is available.
  const waitMs = Math.ceil(((1 - bucket.tokens) / SUSTAINED_PER_MINUTE) * 60000);
  return { allowed: false, waitMs };
}

/**
 * Resolves when this tenant may send. Waits rather than rejecting: a message an
 * agent typed must go out, just not this instant. A caller that cannot wait
 * should check `wouldThrottle` first.
 */
async function acquire(tenantId) {
  const first = takeToken(tenantId);
  if (first.allowed) return;

  logger.info({ tenantId, waitMs: first.waitMs }, 'Pacing outbound WhatsApp message');
  await new Promise((resolve) => setTimeout(resolve, first.waitMs));

  // One retry is enough: the wait was calculated to make a token available.
  // If concurrent sends took it first, proceed anyway rather than queueing
  // indefinitely - the pacing has already done its job.
  takeToken(tenantId);
}

/** Whether the next send would be delayed, without consuming a token. */
function wouldThrottle(tenantId) {
  const bucket = buckets.get(tenantId);
  if (!bucket) return false;
  const elapsedMinutes = (Date.now() - bucket.lastRefill) / 60000;
  return Math.min(BURST, bucket.tokens + elapsedMinutes * SUSTAINED_PER_MINUTE) < 1;
}

/** Drops a disconnected tenant's bucket so the map does not grow forever. */
function forget(tenantId) {
  buckets.delete(tenantId);
}

module.exports = { acquire, wouldThrottle, forget, SUSTAINED_PER_MINUTE, BURST };
