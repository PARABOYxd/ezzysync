const planService = require('./planService');
const logger = require('../utils/logger').child({ module: 'whatsapp_ai_policy' });

/**
 * Whether the AI may answer this message - one decision, both transports.
 *
 * The QR path and the Meta webhook each grew their own copy of this, and they
 * drifted badly. The QR path gained a duplicate-reply lock, a plan check, an
 * opt-out check and an age limit; the webhook kept none of them. On Cloud API
 * that meant "STOP" was ignored, a downgraded tenant still got AI replies it
 * was no longer paying for, and a redelivered webhook could answer the same
 * customer twice.
 *
 * Anything that decides whether to send an automated reply belongs here, so
 * the two paths cannot disagree again.
 */

// How stale a queued message may be and still get an automatic reply. Older
// than this deserves a person: answering a two-hour-old question as though it
// just arrived reads as a malfunction.
const AI_REPLY_MAX_AGE_SECONDS = Number(process.env.AI_REPLY_MAX_AGE_SECONDS) || 15 * 60;

/**
 * Chats with a reply already being generated.
 *
 * Generation takes seconds, and every "should I reply?" check happens before
 * that wait while the resulting insert happens after it - so a second trigger
 * arriving mid-generation re-read a conversation that still looked unanswered
 * and fired its own duplicate reply. Per-process, which is what a single-node
 * deployment needs.
 */
const inFlight = new Set();

/**
 * Whether the customer is asking us to stop.
 *
 * Matched against the whole trimmed message, so "stop" ends it but "stop
 * sending the Goa one, send Kerala" does not. A false positive silently kills
 * a live conversation, which is worse than missing an unusual phrasing - an
 * agent can always switch the chat off by hand.
 */
const OPT_OUT_WORDS = new Set([
  'stop', 'unsubscribe', 'opt out', 'optout', 'remove me',
  'band karo', 'band karo message', 'mat bhejo', 'message mat bhejo',
]);

function isOptOutRequest(text) {
  if (!text) return false;
  const normalised = String(text).trim().toLowerCase().replace(/[.!]+$/, '');
  return OPT_OUT_WORDS.has(normalised);
}

/**
 * @returns {Promise<{allowed: boolean, reason: string}>}
 *   `reason` names the gate that stopped it, for the log line.
 */
async function canAiReply(tenantId, chat, { messageAgeSeconds = 0, isBacklog = false } = {}) {
  if (chat?.opted_out === true) return { allowed: false, reason: 'customer opted out' };

  // The chat's own switch decides. The tenant-level setting is a default
  // applied when a chat is created, not a veto held over every chat after.
  if (chat?.ai_enabled !== true) return { allowed: false, reason: 'AI off for this chat' };

  // An escalation must survive however the flags were set - replying on a chat
  // the AI already backed away from is the worst outcome.
  if (chat?.needs_human === true) return { allowed: false, reason: 'escalated to a human' };

  if (isBacklog && messageAgeSeconds >= AI_REPLY_MAX_AGE_SECONDS) {
    return { allowed: false, reason: 'queued message is too old to answer automatically' };
  }

  // Autopilot fires from a socket or a webhook, not an HTTP route, so the plan
  // check has to happen here too - route middleware alone would leave a
  // downgraded tenant still served by AI on chats enabled before the downgrade.
  const planAllows = await planService.checkFeatureAccess(tenantId, 'canUseAi');
  if (!planAllows) return { allowed: false, reason: 'plan does not include AI' };

  return { allowed: true, reason: 'ok' };
}

/** Claims the reply slot for a chat. False means one is already being written. */
function claim(chatId) {
  if (inFlight.has(chatId)) return false;
  inFlight.add(chatId);
  return true;
}

function release(chatId) {
  inFlight.delete(chatId);
}

/** Convenience wrapper: runs `work` only if no reply is already in flight. */
async function withReplyLock(chatId, work) {
  if (!claim(chatId)) {
    logger.debug({ chatId }, 'A reply is already being generated for this chat');
    return null;
  }
  try {
    return await work();
  } finally {
    release(chatId);
  }
}

module.exports = {
  canAiReply,
  isOptOutRequest,
  withReplyLock,
  claim,
  release,
  AI_REPLY_MAX_AGE_SECONDS,
};
