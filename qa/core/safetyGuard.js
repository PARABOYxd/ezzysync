/**
 * Safety Guard Layer
 * Enforces safety controls before any browser action or API mutation occurs.
 */

const DESTRUCTIVE_KEYWORDS = ['delete', 'remove', 'destroy', 'trash', 'erase', 'purge', 'drop', 'wipe'];
const PAYMENT_KEYWORDS = ['pay', 'purchase', 'checkout', 'charge', 'refund', 'razorpay', 'stripe'];
const EXTERNAL_MSG_KEYWORDS = ['send whatsapp', 'send email', 'broadcast', 'send message', 'notify customer'];
const EMAIL_KEYWORDS = ['send email', 'email customer', 'dispatch email'];
const WHATSAPP_KEYWORDS = ['send whatsapp', 'whatsapp message', 'send wa'];

export class SafetyGuard {
  constructor(config = {}) {
    this.allowDelete = config.ALLOW_DELETE === 'true' || config.ALLOW_DELETE === true;
    this.allowPayment = config.ALLOW_PAYMENT === 'true' || config.ALLOW_PAYMENT === true;
    this.allowExternalMessages = config.ALLOW_EXTERNAL_MESSAGES === 'true' || config.ALLOW_EXTERNAL_MESSAGES === true;
    this.allowEmail = config.ALLOW_EMAIL === 'true' || config.ALLOW_EMAIL === true;
    this.allowWhatsApp = config.ALLOW_WHATSAPP === 'true' || config.ALLOW_WHATSAPP === true;
  }

  /**
   * Evaluates whether an element, action name, or API call is safe to execute.
   * @param {string} actionDescription - e.g. "click Delete Lead button", "POST /api/leads/:id/delete"
   * @returns {{ safe: boolean, reason?: string }}
   */
  checkSafety(actionDescription = '') {
    const text = String(actionDescription).toLowerCase();

    // 1. Destructive check
    if (!this.allowDelete) {
      for (const kw of DESTRUCTIVE_KEYWORDS) {
        if (text.includes(kw)) {
          return {
            safe: false,
            reason: `Blocked destructive action matching keyword "${kw}" (ALLOW_DELETE=false)`
          };
        }
      }
    }

    // 2. Payment check
    if (!this.allowPayment) {
      for (const kw of PAYMENT_KEYWORDS) {
        if (text.includes(kw)) {
          return {
            safe: false,
            reason: `Blocked financial/payment action matching keyword "${kw}" (ALLOW_PAYMENT=false)`
          };
        }
      }
    }

    // 3. WhatsApp check
    if (!this.allowWhatsApp || !this.allowExternalMessages) {
      for (const kw of WHATSAPP_KEYWORDS) {
        if (text.includes(kw)) {
          return {
            safe: false,
            reason: `Blocked live WhatsApp dispatch matching keyword "${kw}" (ALLOW_WHATSAPP=false)`
          };
        }
      }
    }

    // 4. Email check
    if (!this.allowEmail || !this.allowExternalMessages) {
      for (const kw of EMAIL_KEYWORDS) {
        if (text.includes(kw)) {
          return {
            safe: false,
            reason: `Blocked outgoing email dispatch matching keyword "${kw}" (ALLOW_EMAIL=false)`
          };
        }
      }
    }

    return { safe: true };
  }
}
