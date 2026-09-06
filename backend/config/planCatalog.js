/**
 * The one place a plan's price, name and feature list is written down.
 *
 * Everything else derives from here: Razorpay charges `priceInPaise`, and the
 * app's plan modal and trial-expired paywall render `priceLabel` and
 * `features` straight off `GET /api/plans/catalog`. Before this file existed
 * the same numbers were typed out in eight places, and they had already
 * drifted - the AI Tools page offered an upgrade labelled "₹999" while the
 * order it created charged ₹2,499, because it never passed a planId and the
 * backend defaulted to PRO.
 *
 * Changing a price means changing it here, once. The only copies left outside
 * this file are the marketing and legal pages on the landing site, which are
 * static prose and take no payments.
 */

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/**
 * Paise -> "₹2,499". Whole rupees only: every plan is priced in round rupees,
 * and a trailing ".00" in a pricing card reads like a mistake.
 */
function formatPaise(paise) {
  return inr.format(Math.round(paise / 100));
}

const PLANS = [
  {
    id: 'SOLO',
    name: 'Solo Agent',
    // Ordering, not just labelling: a paid plan is never silently replaced by
    // one that ranks lower. See getPlanRank below.
    rank: 1,
    tagline: 'For independent travel consultants.',
    priceInPaise: 99900,
    period: 'month',
    highlight: false,
    features: [
      { label: '1 Dedicated Agent Login', included: true },
      { label: 'Up to 200 Client Leads', included: true },
      { label: 'PDF Itinerary Builder', included: true },
      { label: 'GST Tax Invoices', included: true },
      { label: 'No AI Tools', included: false },
    ],
  },
  {
    id: 'PRO',
    name: 'Agency Growth',
    rank: 2,
    tagline: 'For growing travel agencies & operators.',
    priceInPaise: 249900,
    period: 'month',
    highlight: true,
    badge: 'Most Popular',
    features: [
      { label: 'Up to 5 Team Logins', included: true },
      { label: 'Unlimited Bookings & Leads', included: true },
      { label: '1-Click WhatsApp Business API', included: true },
      { label: 'Multi-Agent Live Chat', included: true },
      { label: 'AI Itinerary Generator ⚡', included: true },
      { label: 'Supplier Costing & Group Tours', included: true },
    ],
  },
  {
    // Quoted per deal, so it has no price and no checkout - the card links to
    // sales instead. `priceInPaise: null` is what marks it unbuyable; nothing
    // downstream should special-case the id.
    id: 'ENTERPRISE',
    name: 'Enterprise & DMCs',
    rank: 3,
    tagline: 'For corporate travel & DMCs.',
    priceInPaise: null,
    priceLabel: 'Custom',
    period: 'year',
    highlight: false,
    contactUrl:
      'https://wa.me/918104665986?text=Hi%2C%20I%20want%20to%20discuss%20EzzySync%20Enterprise%20Plan',
    features: [
      { label: 'Unlimited Agent Logins', included: true },
      { label: 'Multi-Branch Management', included: true },
      { label: 'Custom WhatsApp Flows', included: true },
      { label: 'Dedicated Account Manager', included: true },
      { label: '24/7 Priority Support', included: true },
    ],
  },
];

/**
 * The catalog as the frontend consumes it: every plan already carries the
 * exact string to print, so no client has to know that prices are stored in
 * paise or that Indian digit grouping is 2,499 rather than 2,499.
 */
function getPlanCatalog() {
  return PLANS.map((plan) => ({
    ...plan,
    priceLabel:
      plan.priceLabel || (plan.priceInPaise === null ? 'Custom' : formatPaise(plan.priceInPaise)),
    purchasable: plan.priceInPaise !== null,
  }));
}

/** The amount Razorpay should charge, or null for a plan that isn't sold online. */
function getPlanPricePaise(planId) {
  const plan = PLANS.find((p) => p.id === planId);
  return plan ? plan.priceInPaise : null;
}

/** Plan ids a customer can actually check out with. */
function getPurchasablePlanIds() {
  return PLANS.filter((p) => p.priceInPaise !== null).map((p) => p.id);
}

/**
 * How much plan a tenant has, as a comparable number.
 *
 * Used to stop a cheaper purchase from overwriting a better plan that is still
 * running. That is not hypothetical - it happened to this project's own
 * account: a SOLO payment replaced an active PRO plan, and nothing anywhere
 * questioned it, because upgrade and downgrade went through the identical
 * code path.
 *
 * Anything unrecognised ranks 0, below every real plan, so an unknown id can
 * never be treated as an upgrade.
 */
function getPlanRank(planId) {
  const plan = PLANS.find((p) => p.id === planId);
  return plan?.rank || 0;
}

module.exports = {
  getPlanCatalog,
  getPlanPricePaise,
  getPurchasablePlanIds,
  getPlanRank,
  formatPaise,
};
