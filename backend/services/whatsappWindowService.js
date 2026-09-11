/**
 * The 24-hour customer service window, in one place.
 *
 * On the Meta Cloud API a business may only send free-form messages for 24
 * hours after the customer's last message. Outside that, the only thing Meta
 * accepts is an approved template - and it refuses the free-form send with
 * error 131047, which the agent never sees. Their reply simply does not
 * arrive, and nothing in the app explains why.
 *
 * Two details people get wrong, so they are worth stating:
 *
 *  - Sending a template does NOT re-open the window. Only a message from the
 *    customer does. A template is how you ask them to write back.
 *  - The rule belongs to the Cloud API alone. A QR-linked number has no such
 *    limit, which is why every answer here depends on the chat's transport.
 */

const WINDOW_HOURS = 24;
const WINDOW_MS = WINDOW_HOURS * 60 * 60 * 1000;

/**
 * What the agent is allowed to send in this chat right now.
 *
 * @param {object} chat  a whatsapp_chats row
 * @returns {{applies: boolean, isOpen: boolean, expiresAt: Date|null, msRemaining: number}}
 *   `applies: false` means the transport has no window rule at all - the UI
 *   should show nothing rather than a permanently green badge.
 */
function getWindowState(chat) {
  const applies = chat?.transport === 'cloud_api';

  if (!applies) {
    return { applies: false, isOpen: true, expiresAt: null, msRemaining: 0 };
  }

  const lastInbound = chat.last_inbound_at ? new Date(chat.last_inbound_at) : null;

  // A chat the customer has never written in was opened by us, so there is no
  // window yet - only a template can start it.
  if (!lastInbound || Number.isNaN(lastInbound.getTime())) {
    return { applies: true, isOpen: false, expiresAt: null, msRemaining: 0 };
  }

  const expiresAt = new Date(lastInbound.getTime() + WINDOW_MS);
  const msRemaining = expiresAt.getTime() - Date.now();

  return {
    applies: true,
    isOpen: msRemaining > 0,
    expiresAt,
    msRemaining: Math.max(0, msRemaining),
  };
}

/** Shape sent to the browser; the UI never recomputes the rule itself. */
function toClientWindow(chat) {
  const state = getWindowState(chat);
  return {
    applies: state.applies,
    isOpen: state.isOpen,
    expiresAt: state.expiresAt ? state.expiresAt.toISOString() : null,
    // Sent so a countdown does not depend on the browser's clock being right.
    secondsRemaining: Math.floor(state.msRemaining / 1000),
  };
}

/**
 * Throws when a free-form send would be refused by Meta.
 *
 * Checked before calling Meta rather than after, so the agent gets an
 * explanation and a way forward instead of a silent failure.
 */
function assertCanSendFreeform(chat) {
  const state = getWindowState(chat);
  if (!state.applies || state.isOpen) return;

  const err = new Error(
    'This customer has not replied in 24 hours, so WhatsApp only allows an approved ' +
      'template message here. Pick one below to re-open the conversation.'
  );
  err.status = 409;
  err.code = 'WHATSAPP_WINDOW_CLOSED';
  throw err;
}

module.exports = { getWindowState, toClientWindow, assertCanSendFreeform, WINDOW_HOURS };
