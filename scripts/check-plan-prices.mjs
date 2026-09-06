/**
 * Fails if the landing site's price mirror has drifted from the backend catalog.
 *
 * The app reads its prices over the API, so it cannot disagree with what
 * Razorpay charges. The landing site can: it is a separate, statically
 * generated deployment that keeps its own copy in `landing/src/data/plans.js`.
 * This is the thing that stops that copy from quietly going stale - the exact
 * failure that put a "₹999" button in front of a ₹2,499 checkout.
 *
 *   node scripts/check-plan-prices.mjs
 *
 * Exits 0 when they match, 1 with a diff when they do not.
 */

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const { getPlanCatalog } = require(path.join(root, 'backend/config/planCatalog.js'));
const { PLAN_PRICES_PAISE } = await import(
  // A file URL, because a bare Windows path is not a valid ESM specifier.
  new URL(`file://${path.join(root, 'landing/src/data/plans.js').replace(/\\/g, '/')}`)
);

const backend = Object.fromEntries(
  getPlanCatalog()
    .filter((plan) => plan.purchasable)
    .map((plan) => [plan.id, plan.priceInPaise])
);

const mismatches = [];

for (const [id, paise] of Object.entries(backend)) {
  if (PLAN_PRICES_PAISE[id] !== paise) {
    mismatches.push(
      `  ${id}: backend ${paise} paise, landing ${PLAN_PRICES_PAISE[id] ?? '(missing)'}`
    );
  }
}

for (const id of Object.keys(PLAN_PRICES_PAISE)) {
  if (!(id in backend)) {
    mismatches.push(`  ${id}: present on the landing site but not sold by the backend`);
  }
}

if (mismatches.length) {
  console.error('Plan prices have drifted between the backend and the landing site:\n');
  console.error(mismatches.join('\n'));
  console.error(
    '\nFix backend/config/planCatalog.js and landing/src/data/plans.js so they agree.'
  );
  process.exit(1);
}

console.log(
  `Plan prices match across backend and landing: ${Object.entries(backend)
    .map(([id, paise]) => `${id} ₹${paise / 100}`)
    .join(', ')}`
);
