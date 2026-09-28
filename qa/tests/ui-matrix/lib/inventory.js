/**
 * Every screen the frontend routes to, as data.
 *
 * Mirrors frontend/src/App.jsx. `module`/`action` are what RequirePermission
 * checks for that route: a user without it is sent back to /dashboard, and
 * the matrix checks both halves of that - the member who has it gets the
 * page, the member who does not gets redirected rather than a broken page.
 *
 * The route-parity spec reads App.jsx and fails if a route exists there and
 * not here, so a new page cannot quietly go untested.
 */

export const APP_ROUTES = [
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/leads', name: 'Leads', module: 'leads' },
  { path: '/pipeline', name: 'Pipeline', module: 'leads' },
  { path: '/follow-ups', name: 'Follow-ups', module: 'followUps' },
  { path: '/bookings', name: 'Bookings', module: 'bookings' },
  { path: '/upcoming-trips', name: 'Upcoming Trips', module: 'bookings' },
  { path: '/whatsapp-chat', name: 'WhatsApp Chat', module: 'bookings' },
  { path: '/tour-batches', name: 'Group Tours', module: 'tourBatches' },
  { path: '/invoices', name: 'Invoices', module: 'invoices' },
  { path: '/quotations', name: 'Quotations', module: 'quotations' },
  { path: '/profile', name: 'Profile' },
  { path: '/settings', name: 'Settings' },
  { path: '/hotels', name: 'Hotels', module: 'hotels' },
  { path: '/guide', name: 'User Guide' },
  // Admin-only by design: Team.jsx redirects everyone else.
  { path: '/team', name: 'Team', adminOnly: true },
  { path: '/customers', name: 'Customers', module: 'customers' },
  { path: '/customers/:id', name: 'Customer Profile', module: 'customers', param: 'customerId' },
  { path: '/billing', name: 'Billing', module: 'billing' },
  { path: '/expenses', name: 'Expenses', module: 'expenses' },
];

export const PUBLIC_ROUTES = [
  { path: '/login', name: 'Login' },
  { path: '/register', name: 'Register' },
  { path: '/forgot-password', name: 'Forgot Password' },
  { path: '/reset-password', name: 'Reset Password' },
  { path: '/quote-preview/:uuid', name: 'Quotation Preview', param: 'quotationUuid' },
];

/** Fills :param from the seeded world; null when the seed did not produce it. */
export function resolveRoute(route, data) {
  if (!route.param) return route.path;
  const value = data?.[route.param];
  return value ? route.path.replace(/:[a-z]+/i, encodeURIComponent(value)) : null;
}

/**
 * Buttons the matrix will not press, by accessible name or title.
 *
 * Everything else on every page gets clicked. These are left alone because
 * pressing them does something outside the test tenant (sends a message,
 * charges a card, opens Google), ends the session the rest of the walk
 * needs, or destroys the seeded record the next button needs. Each skip is
 * counted and listed in the report, so the list stays honest.
 */
export const DO_NOT_PRESS = [
  /\bdelete\b/i, /\bremove\b/i, /\btrash\b/i, /\barchive\b/i,
  /log ?out/i, /sign ?out/i,
  /\bsend\b/i, /\bemail\b/i, /whats ?app/i, /\bbroadcast\b/i, /\bremind/i,
  /\bpay\b/i, /\bupgrade\b/i, /\bsubscribe\b/i, /\bcheckout\b/i, /\bbuy\b/i, /\brazorpay\b/i,
  /\bconnect\b/i, /\bdisconnect\b/i, /\bgoogle\b/i, /\bgmail\b/i, /\bmeta\b/i, /\binstagram\b/i,
  /\bregenerate\b/i, /\bsync\b/i, /\bsubmit to\b/i,
  // Starts a real WhatsApp Web session on the backend under test. In the
  // first full run this is what froze the API: unscanned sessions
  // reconnected forever (since fixed in whatsappWebService, but a test has
  // no business starting one either way).
  /\bqr\b/i, /\bscan\b/i, /link (a )?device/i, /link whatsapp/i,
  /\bimport\b/i, /\bupload\b/i, /\bchoose file\b/i, /\battach/i,
  /\bgenerate\b/i, /\bai\b/i, /autopilot/i, /\bparse\b/i, /\bsuggest/i,
  /\bconvert\b/i, /\bclaim\b/i, /\bmark (as )?(done|won|lost|paid|complete)/i,
  /\bcancel booking\b/i, /\breset\b/i, /\bprint\b/i,
];

export const isDangerous = (name) => DO_NOT_PRESS.some((re) => re.test(name || ''));

/** Values thrown at every field of every create form. */
export const FORM_VALUES = [
  { label: 'empty', value: '' },
  { label: 'whitespace only', value: '     ' },
  { label: '5,000 characters', value: 'A'.repeat(5000) },
  { label: 'script tag', value: '<script>alert("ui-xss")</script>' },
  { label: 'img onerror', value: '<img src=x onerror=alert("ui-xss")>' },
  { label: 'SQL injection', value: "'; DROP TABLE leads; --" },
  { label: 'emoji and unicode', value: 'टेस्ट 🧪🚀 ñ' },
  { label: 'negative number', value: '-5000' },
  { label: 'huge number', value: '999999999999999999999' },
  { label: 'not an email', value: 'not-an-email@' },
  { label: 'letters in a number field', value: 'abc' },
  { label: 'template injection', value: '{{constructor.constructor("alert(1)")()}}' },
];
