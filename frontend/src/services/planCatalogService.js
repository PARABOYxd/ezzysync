import api from './api';

/**
 * The plan cards, priced by the server.
 *
 * No price is written down on this side any more. The plan modal in Profile
 * and the trial-expired paywall in DashboardLayout both render whatever this
 * returns, so neither can advertise a number Razorpay will not charge - which
 * is exactly what had happened: an "Upgrade for ₹999" button opened a ₹2,499
 * checkout, and the same two numbers were also typed into six other files.
 *
 * There is intentionally no hardcoded fallback list. A wrong price shown
 * confidently is worse than no price shown at all, so callers render a
 * loading state and then an error, never a guess.
 */

// The catalog is the same for every user and changes about never, so the
// first component to ask for it fetches, and the rest of the session shares
// that one response. Concurrent callers await the same promise rather than
// each firing their own request.
let catalogPromise = null;

export function getPlanCatalog() {
  if (!catalogPromise) {
    catalogPromise = api
      .get('/plans/catalog')
      .then((r) => r.data.plans)
      .catch((err) => {
        // Don't cache a failure - a later render should be able to retry.
        catalogPromise = null;
        throw err;
      });
  }
  return catalogPromise;
}

/** Finds one plan by id, or undefined. */
export function findPlan(plans, id) {
  return (plans || []).find((p) => p.id === id);
}
