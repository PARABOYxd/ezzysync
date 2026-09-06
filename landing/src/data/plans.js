/**
 * Plan pricing for the marketing site.
 *
 * The real source of truth is `backend/config/planCatalog.js` - that is what
 * Razorpay charges and what the app renders. The landing site is a separate
 * deployment and is statically generated for SEO, so it cannot import backend
 * code and should not depend on the API being reachable at build time. It
 * keeps this one mirror instead.
 *
 * One mirror, not eight: before this file, the same numbers were typed into
 * the pricing section, the JSON-LD on two pages, the terms page, the refund
 * policy, the blog index and a blog post. Running
 * `node scripts/check-plan-prices.mjs` from the repo root compares this file
 * against the backend catalog and exits non-zero if they have drifted, so
 * changing a price stays a two-file job that cannot be half-done.
 */

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export const PLAN_PRICES_PAISE = {
  SOLO: 99900,
  PRO: 249900,
};

/** Paise -> "₹2,499", matching how the app formats the same number. */
export function formatPaise(paise) {
  return inr.format(Math.round(paise / 100));
}

/** Bare rupee integers, for JSON-LD `price` fields which must not carry symbols. */
export const PLAN_PRICE_RUPEES = {
  SOLO: String(PLAN_PRICES_PAISE.SOLO / 100),
  PRO: String(PLAN_PRICES_PAISE.PRO / 100),
};

/** Display strings for prose and pricing cards. */
export const PLAN_PRICE_LABEL = {
  SOLO: formatPaise(PLAN_PRICES_PAISE.SOLO),
  PRO: formatPaise(PLAN_PRICES_PAISE.PRO),
};

/** "₹999/month" style strings, the form most of the copy uses. */
export const PLAN_PRICE_MONTHLY = {
  SOLO: `${PLAN_PRICE_LABEL.SOLO}/month`,
  PRO: `${PLAN_PRICE_LABEL.PRO}/month`,
};
