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

  // Keyword-style URLs people (and other sites) link to. Each intent already
  // has one page; a second page on the same topic would compete with it.
  { source: "/travel-crm", destination: "/" },
  { source: "/travel-agency-crm", destination: "/solutions/travel-agencies" },
  { source: "/tour-operator-crm", destination: "/solutions/tour-operators" },
  { source: "/travel-lead-management", destination: "/features/lead-management" },
  { source: "/travel-booking-software", destination: "/features/booking-management" },
  { source: "/whatsapp-crm-for-travel-agencies", destination: "/features/whatsapp-automation" },
  { source: "/travel-itinerary-software", destination: "/features/itinerary-builder" },
  { source: "/travel-agency-automation", destination: "/features/automation" },
  { source: "/travel-crm-vs-excel", destination: "/compare/excel" },

  // Singular / alternate spellings of real sections.
  { source: "/feature", destination: "/features" },
  { source: "/solution", destination: "/solutions" },
  { source: "/price", destination: "/pricing" },
  { source: "/itinerary-builder", destination: "/free-itinerary-builder" },
].map((r) => ({ ...r, permanent: true }));
