import { getLoginUrl, getTrialUrl } from "../lib/crmUrl.js";

/**
 * Permanent (301/308) redirects. When a page is renamed or removed, add the
 * old path here pointing at its closest replacement, so links and rankings
 * it earned carry over instead of ending in a 404.
 *
 * Read by next.config.mjs, so it cannot use the "@/" import alias.
 */
export const redirects = [
  // People type these straight into the address bar.
  { source: "/signup", destination: getTrialUrl() },
  { source: "/register", destination: getTrialUrl() },
  { source: "/free-trial", destination: getTrialUrl() },
  { source: "/login", destination: getLoginUrl() },
  { source: "/signin", destination: getLoginUrl() },

  // Singular / alternate spellings of real sections.
  { source: "/feature", destination: "/features" },
  { source: "/solution", destination: "/solutions" },
  { source: "/price", destination: "/pricing" },
  { source: "/itinerary-builder", destination: "/free-itinerary-builder" },
].map((r) => ({ ...r, permanent: true }));
