/**
 * Every route the app exposes, described as data.
 *
 * The rules do not know anything about leads or bookings; they know about
 * "an endpoint that requires auth", "an endpoint with an :id", "a field that
 * is supposed to be an email". All the domain knowledge lives here, in one
 * table, which is why adding a route to the app means adding one entry here
 * and getting roughly eighty new test cases for free.
 *
 * Fields:
 *   auth        'required' | 'public' | 'webhook'
 *   permission  [module, action] enforced by requirePermission, or null
 *   adminOnly   the route gates on role === 'ADMIN' directly
 *   params      { ':param name': 'fixture resource key' }
 *   body        { field: { type, required } } - the shape the route accepts
 *   sample      (ctx) => a body that should be accepted as-is
 *   externals   reaches a provider (WhatsApp/Razorpay/Gemini/R2/SMTP)
 *   heavy       slow (PDF render, file parse) - cheap rules only
 *   destructive deletes something; never run on the happy path
 *   upload      multipart route; body fuzzing does not apply
 */

const T = {
  string: 'string',
  text: 'text',
  email: 'email',
  phone: 'phone',
  int: 'int',
  float: 'float',
  date: 'date',
  bool: 'bool',
  enum: 'enum',
  json: 'json',
  id: 'id',
};

const f = (type, opts = {}) => ({ type, required: false, ...opts });
const req = (type, opts = {}) => ({ type, required: true, ...opts });

/** Query parameters every list endpoint gets fuzzed with, route or not. */
export const GENERIC_QUERY_PARAMS = [
  'page', 'limit', 'offset', 'search', 'q', 'sort', 'order',
  'status', 'stage', 'from', 'to', 'startDate', 'endDate', 'assignedTo',
];

export const ENDPOINTS = [
  // ---------------------------------------------------------------- health
  { id: 'health.get', method: 'get', path: '/api/health', auth: 'public' },
  { id: 'public.features', method: 'get', path: '/api/public/features', auth: 'public' },
  { id: 'plans.catalog', method: 'get', path: '/api/plans/catalog', auth: 'public' },

  // ------------------------------------------------------------------ auth
  {
    id: 'auth.register', method: 'post', path: '/api/auth/register', auth: 'public',
    body: {
      email: req(T.email), password: req(T.string, { minLength: 6 }), name: req(T.string),
      companyName: req(T.string), regToken: req(T.string), otp: req(T.string, { exactLength: 6 }),
    },
    sample: (ctx) => ({
      email: `${ctx.uniq('reg')}@qa.invalid`, password: 'QaPassword123', name: 'QA Registrant',
      companyName: 'QA Travels', regToken: 'not-a-real-token', otp: '123456',
    }),
    // A valid-looking body still fails on the token check, which is the point:
    // registration must not be completable without a real OTP token.
    expectSampleRejected: true,
  },
  {
    id: 'auth.login', method: 'post', path: '/api/auth/login', auth: 'public',
    body: { email: req(T.email), password: req(T.string) },
    sample: (ctx) => ({ email: ctx.users.adminA.email, password: 'definitely-not-the-password' }),
    expectSampleRejected: true,
  },
  { id: 'auth.me', method: 'get', path: '/api/auth/me', auth: 'required' },
  {
    id: 'auth.refresh', method: 'post', path: '/api/auth/refresh', auth: 'public',
    body: { refreshToken: req(T.string) },
    sample: () => ({ refreshToken: 'not-a-real-refresh-token' }),
    expectSampleRejected: true,
  },
  { id: 'auth.logout', method: 'post', path: '/api/auth/logout', auth: 'public', body: { refreshToken: f(T.string) }, sample: () => ({ refreshToken: 'anything' }) },
  {
    id: 'auth.forgotPassword', method: 'post', path: '/api/auth/forgot-password', auth: 'public',
    body: { email: req(T.email) }, sample: (ctx) => ({ email: `${ctx.uniq('nobody')}@qa.invalid` }),
    externals: true, rateLimited: 'otpRequest',
  },
  {
    id: 'auth.resetPassword', method: 'post', path: '/api/auth/reset-password', auth: 'public',
    body: { email: req(T.email), otp: req(T.string, { exactLength: 6 }), newPassword: req(T.string, { minLength: 6 }) },
    sample: (ctx) => ({ email: ctx.users.adminA.email, otp: '000000', newPassword: 'QaPassword123' }),
    expectSampleRejected: true, rateLimited: 'otpVerify',
  },
  {
    id: 'auth.sendRegistrationOtp', method: 'post', path: '/api/auth/register/send-otp', auth: 'public',
    body: { email: req(T.email) }, sample: (ctx) => ({ email: `${ctx.uniq('otp')}@qa.invalid` }),
    externals: true, rateLimited: 'otpRequest',
  },
  {
    id: 'auth.verifyRegistrationOtp', method: 'post', path: '/api/auth/register/verify-otp', auth: 'public',
    body: { email: req(T.email), regToken: req(T.string), otp: req(T.string, { exactLength: 6 }) },
    sample: (ctx) => ({ email: `${ctx.uniq('otp')}@qa.invalid`, regToken: 'nope', otp: '123456' }),
    expectSampleRejected: true, rateLimited: 'otpVerify',
  },
  { id: 'auth.googleRedirect', method: 'get', path: '/api/auth/google', auth: 'public', externals: true, skipHappy: true },
  { id: 'auth.googleCallback', method: 'get', path: '/api/auth/google/callback', auth: 'public', externals: true, skipHappy: true },

  // ---------------------------------------------------------------- google
  { id: 'google.auth', method: 'get', path: '/api/google/auth', auth: 'public', externals: true, skipHappy: true },
  { id: 'google.callback', method: 'get', path: '/api/google/callback', auth: 'public', externals: true, skipHappy: true },
  { id: 'google.gmailStatus', method: 'get', path: '/api/google/gmail/status', auth: 'required' },
  { id: 'google.gmailDisconnect', method: 'post', path: '/api/google/gmail/disconnect', auth: 'required', mutating: true },

  // ----------------------------------------------------------------- plans
  { id: 'plans.me', method: 'get', path: '/api/plans/me', auth: 'required' },

  // --------------------------------------------------------------- profile
  { id: 'profile.get', method: 'get', path: '/api/profile', auth: 'required' },
  {
    id: 'profile.update', method: 'put', path: '/api/profile', auth: 'required', mutating: true,
    body: { name: f(T.string), companyName: f(T.string), phone: f(T.phone), email: f(T.email), logoUrl: f(T.string) },
    sample: () => ({ name: 'QA Updated Name', companyName: 'QA Travels Updated' }),
  },
  {
    id: 'profile.changePassword', method: 'put', path: '/api/profile/password', auth: 'required', mutating: true,
    body: { currentPassword: req(T.string), newPassword: req(T.string, { minLength: 6 }) },
    sample: () => ({ currentPassword: 'wrong-current-password', newPassword: 'QaPassword123' }),
    expectSampleRejected: true,
  },

  // -------------------------------------------------------------- payments
  { id: 'payments.webhook', method: 'post', path: '/api/payments/webhook', auth: 'webhook', body: { event: f(T.string), payload: f(T.json) }, sample: () => ({ event: 'payment.captured', payload: {} }), expectSampleRejected: true },
  {
    id: 'payments.createSubscriptionOrder', method: 'post', path: '/api/payments/create-subscription-order', auth: 'required',
    body: { planId: req(T.string) }, sample: () => ({ planId: 'PRO' }), externals: true,
  },
  {
    id: 'payments.verifySubscription', method: 'post', path: '/api/payments/verify-subscription', auth: 'required',
    body: {
      razorpay_order_id: req(T.string), razorpay_payment_id: req(T.string),
      razorpay_signature: req(T.string), planId: req(T.string),
    },
    sample: () => ({ razorpay_order_id: 'order_qa', razorpay_payment_id: 'pay_qa', razorpay_signature: 'sig_qa', planId: 'PRO' }),
    expectSampleRejected: true,
  },

  // ----------------------------------------------------------------- leads
  { id: 'leads.list', method: 'get', path: '/api/leads', auth: 'required', permission: ['leads', 'read'], list: true },
  { id: 'leads.pool', method: 'get', path: '/api/leads/pool', auth: 'required', permission: ['leads', 'read'], list: true },
  { id: 'leads.pipeline', method: 'get', path: '/api/leads/pipeline', auth: 'required', permission: ['leads', 'read'], list: true },
  { id: 'leads.importFields', method: 'get', path: '/api/leads/import/fields', auth: 'required', permission: ['leads', 'create'] },
  { id: 'leads.importTemplate', method: 'get', path: '/api/leads/import/template', auth: 'required', permission: ['leads', 'create'], heavy: true },
  { id: 'leads.importPreview', method: 'post', path: '/api/leads/import/preview', auth: 'required', permission: ['leads', 'create'], upload: true, skipHappy: true },
  {
    id: 'leads.importAnalyze', method: 'post', path: '/api/leads/import/analyze', auth: 'required', permission: ['leads', 'create'],
    body: { headers: f(T.json), rows: f(T.json) }, sample: () => ({ headers: ['Name', 'Phone'], rows: [['QA Name', '9876543210']] }),
  },
  {
    id: 'leads.importRun', method: 'post', path: '/api/leads/import', auth: 'required', permission: ['leads', 'create'], mutating: true,
    body: { mapping: f(T.json), rows: f(T.json) },
    sample: (ctx) => ({ mapping: { customerName: 0, phone: 1 }, rows: [['QA Import', ctx.newPhone()]] }),
  },
  {
    id: 'leads.bulkImport', method: 'post', path: '/api/leads/bulk-import', auth: 'required', permission: ['leads', 'create'], mutating: true,
    body: { leads: req(T.json) },
    sample: (ctx) => ({ leads: [{ customerName: 'QA Bulk', phone: ctx.newPhone(), source: 'Manual' }] }),
  },
  {
    id: 'leads.broadcast', method: 'post', path: '/api/leads/broadcast', auth: 'required', permission: ['leads', 'update'], mutating: true,
    body: { leadIds: f(T.json), message: f(T.text), templateName: f(T.string) },
    sample: (ctx) => ({ leadIds: [ctx.res.A.lead], message: 'QA broadcast message' }),
    externals: true,
  },
  { id: 'leads.listBroadcasts', method: 'get', path: '/api/leads/broadcasts', auth: 'required', permission: ['leads', 'read'], list: true },
  {
    id: 'leads.broadcastDetail', method: 'get', path: '/api/leads/broadcasts/:broadcastId', auth: 'required', permission: ['leads', 'read'],
    params: { broadcastId: 'unknownNumeric' }, skipHappy: true,
  },
  { id: 'leads.getOne', method: 'get', path: '/api/leads/:id', auth: 'required', permission: ['leads', 'read'], params: { id: 'lead' } },
  {
    id: 'leads.create', method: 'post', path: '/api/leads', auth: 'required', permission: ['leads', 'create'], mutating: true,
    body: {
      customerName: f(T.string), phone: req(T.phone), email: f(T.email), interest: f(T.string),
      source: f(T.string), stage: f(T.string), assignedTo: f(T.string), notes: f(T.text),
      nextFollowUpDate: f(T.date), departureDate: f(T.date), travelers: f(T.int),
    },
    sample: (ctx) => ({ customerName: 'QA New Lead', phone: ctx.newPhone(), email: 'qa.lead@qa.invalid', source: 'Manual', stage: 'New' }),
  },
  {
    id: 'leads.update', method: 'put', path: '/api/leads/:id', auth: 'required', permission: ['leads', 'update'], mutating: true,
    params: { id: 'lead' },
    body: { customerName: f(T.string), phone: f(T.phone), email: f(T.email), stage: f(T.string), notes: f(T.text), travelers: f(T.int) },
    sample: () => ({ customerName: 'QA Updated Lead', notes: 'updated by matrix' }),
  },
  {
    id: 'leads.updateStage', method: 'patch', path: '/api/leads/:id/stage', auth: 'required', permission: ['leads', 'update'], mutating: true,
    params: { id: 'lead' }, body: { stage: req(T.string) }, sample: () => ({ stage: 'Contacted' }),
  },
  {
    id: 'leads.convert', method: 'post', path: '/api/leads/:id/convert', auth: 'required', permission: ['leads', 'update'], mutating: true,
    params: { id: 'lead' }, body: { trip: f(T.string), departure: f(T.date), members: f(T.int), pricePerPerson: f(T.float) },
    sample: () => ({ trip: 'QA Converted Trip', departure: '2026-12-20', members: 2, pricePerPerson: 12000 }),
    skipHappy: true,
  },
  {
    id: 'leads.claim', method: 'post', path: '/api/leads/:id/claim', auth: 'required', permission: ['leads', 'update'], mutating: true,
    params: { id: 'lead' }, body: {}, sample: () => ({}),
  },
  {
    id: 'leads.remove', method: 'delete', path: '/api/leads/:id', auth: 'required', permission: ['leads', 'delete'],
    params: { id: 'lead' }, destructive: true,
  },
  { id: 'leads.listFollowUps', method: 'get', path: '/api/leads/:id/follow-ups', auth: 'required', params: { id: 'lead' } },
  {
    id: 'leads.createFollowUp', method: 'post', path: '/api/leads/:id/follow-ups', auth: 'required', mutating: true,
    params: { id: 'lead' }, body: { note: f(T.text), followUpDate: f(T.date), status: f(T.string) },
    sample: () => ({ note: 'QA follow-up note', followUpDate: '2026-11-25' }),
  },

  // -------------------------------------------------------------- bookings
  { id: 'bookings.list', method: 'get', path: '/api/bookings', auth: 'required', permission: ['bookings', 'read'], list: true },
  { id: 'bookings.exportCsv', method: 'get', path: '/api/bookings/export/csv', auth: 'required', permission: ['bookings', 'read'], heavy: true },
  { id: 'bookings.getOne', method: 'get', path: '/api/bookings/:id', auth: 'required', permission: ['bookings', 'read'], params: { id: 'booking' } },
  {
    id: 'bookings.create', method: 'post', path: '/api/bookings', auth: 'required', permission: ['bookings', 'create'], mutating: true,
    body: {
      customerName: req(T.string), phone: req(T.phone), email: req(T.email), trip: req(T.string),
      departure: req(T.date), members: req(T.int, { min: 1 }), pricePerPerson: req(T.float, { min: 0 }),
      travelStatus: f(T.string), pickup: f(T.string), notes: f(T.text), emergencyContact: f(T.phone),
      sharingType: f(T.string), teamMember: f(T.string),
    },
    sample: (ctx) => ({
      customerName: 'QA Booking Customer', phone: ctx.newPhone(), email: 'qa.b@qa.invalid',
      trip: 'QA Trip', departure: '2026-12-05', members: 2, pricePerPerson: 10000, travelStatus: 'Booked',
    }),
  },
  {
    id: 'bookings.update', method: 'put', path: '/api/bookings/:id', auth: 'required', permission: ['bookings', 'update'], mutating: true,
    params: { id: 'booking' },
    body: { customerName: f(T.string), phone: f(T.phone), email: f(T.email), members: f(T.int, { min: 1 }), pricePerPerson: f(T.float, { min: 0 }), notes: f(T.text), travelStatus: f(T.string) },
    sample: () => ({ notes: 'QA updated booking note' }),
  },
  { id: 'bookings.remove', method: 'delete', path: '/api/bookings/:id', auth: 'required', permission: ['bookings', 'delete'], params: { id: 'booking' }, destructive: true },
  { id: 'bookings.listFollowUps', method: 'get', path: '/api/bookings/:id/follow-ups', auth: 'required', permission: ['bookings', 'read'], params: { id: 'booking' } },
  {
    id: 'bookings.createFollowUp', method: 'post', path: '/api/bookings/:id/follow-ups', auth: 'required', permission: ['bookings', 'update'], mutating: true,
    params: { id: 'booking' }, body: { note: f(T.text), followUpDate: f(T.date) },
    sample: () => ({ note: 'QA booking follow-up', followUpDate: '2026-11-28' }),
  },
  { id: 'bookings.listPayments', method: 'get', path: '/api/bookings/:id/payments', auth: 'required', permission: ['bookings', 'read'], params: { id: 'booking' } },
  {
    id: 'bookings.addPayment', method: 'post', path: '/api/bookings/:id/payments', auth: 'required', permission: ['bookings', 'update'], mutating: true,
    params: { id: 'booking' }, body: { amount: req(T.float, { min: 0 }), method: f(T.string), note: f(T.text), paidAt: f(T.date) },
    sample: () => ({ amount: 1000, method: 'Cash', note: 'QA part payment' }),
  },
  {
    id: 'bookings.removePayment', method: 'delete', path: '/api/bookings/:id/payments/:paymentId', auth: 'required', permission: ['bookings', 'update'],
    params: { id: 'booking', paymentId: 'unknownNumeric' }, destructive: true, skipHappy: true,
  },
  { id: 'bookings.voucherPdf', method: 'get', path: '/api/bookings/:id/voucher-pdf', auth: 'required', permission: ['bookings', 'read'], params: { id: 'booking' }, heavy: true },
  {
    id: 'bookings.sendVoucher', method: 'post', path: '/api/bookings/:id/send-voucher', auth: 'required', permission: ['bookings', 'update'],
    params: { id: 'booking' }, body: { channel: f(T.string) }, sample: () => ({ channel: 'whatsapp' }),
    externals: true, heavy: true,
  },
  {
    id: 'bookings.sendReminder', method: 'post', path: '/api/bookings/:id/send-reminder', auth: 'required', permission: ['bookings', 'update'],
    params: { id: 'booking' }, body: { type: f(T.string) }, sample: () => ({ type: 'payment' }),
    externals: true, heavy: true,
  },

  // ------------------------------------------------------------ quotations
  // A share link is meant to open for whoever the agency sends it to, who is
  // by definition outside the tenant. Exempt from the isolation rule.
  { id: 'quotations.publicGet', method: 'get', path: '/api/quotations/public/:uuid', auth: 'public', params: { uuid: 'quotationUuid' }, rateLimited: 'public', publicByDesign: true },
  {
    id: 'quotations.acceptPublic', method: 'post', path: '/api/quotations/:id/accept-public', auth: 'public',
    params: { id: 'quotation' }, body: { name: f(T.string), phone: f(T.phone) }, sample: () => ({ name: 'QA Customer' }),
    mutating: true, skipHappy: true, rateLimited: 'public',
  },
  { id: 'quotations.list', method: 'get', path: '/api/quotations', auth: 'required', permission: ['quotations', 'read'], list: true },
  { id: 'quotations.getOne', method: 'get', path: '/api/quotations/:id', auth: 'required', permission: ['quotations', 'read'], params: { id: 'quotation' } },
  {
    id: 'quotations.create', method: 'post', path: '/api/quotations', auth: 'required', permission: ['quotations', 'create'], mutating: true,
    body: {
      customerName: f(T.string), tripName: req(T.string), email: f(T.email), phone: f(T.phone),
      priceQuote: f(T.float, { min: 0 }), validUntil: f(T.date), status: f(T.string),
      itineraryDays: f(T.json), inclusions: f(T.json), exclusions: f(T.json), highlights: f(T.json),
      hotelCostPerPax: f(T.float), flightCostPerPax: f(T.float),
    },
    sample: (ctx) => ({ customerName: 'QA Quote', tripName: 'QA Trip Quote', phone: ctx.newPhone(), priceQuote: 25000 }),
  },
  {
    id: 'quotations.update', method: 'put', path: '/api/quotations/:id', auth: 'required', permission: ['quotations', 'update'], mutating: true,
    params: { id: 'quotation' },
    body: { customerName: f(T.string), tripName: req(T.string), email: f(T.email), phone: f(T.phone), priceQuote: f(T.float, { min: 0 }), status: f(T.string) },
    sample: () => ({ tripName: 'QA Trip Quote Updated', priceQuote: 26000 }),
  },
  { id: 'quotations.remove', method: 'delete', path: '/api/quotations/:id', auth: 'required', permission: ['quotations', 'delete'], params: { id: 'quotation' }, destructive: true },
  {
    id: 'quotations.accept', method: 'post', path: '/api/quotations/:id/accept', auth: 'required', permission: ['quotations', 'update'], mutating: true,
    params: { id: 'quotation' }, body: {}, sample: () => ({}), skipHappy: true,
  },
  {
    id: 'quotations.duplicate', method: 'post', path: '/api/quotations/:id/duplicate', auth: 'required', permission: ['quotations', 'create'], mutating: true,
    params: { id: 'quotation' }, body: {}, sample: () => ({}),
  },

  // --------------------------------------------------------------- hotels
  { id: 'hotels.list', method: 'get', path: '/api/hotels', auth: 'required', permission: ['hotels', 'read'], list: true },
  { id: 'hotels.getOne', method: 'get', path: '/api/hotels/:id', auth: 'required', permission: ['hotels', 'read'], params: { id: 'hotel' } },
  {
    id: 'hotels.create', method: 'post', path: '/api/hotels', auth: 'required', permission: ['hotels', 'create'], mutating: true,
    body: {
      name: req(T.string), city: req(T.string), rating: f(T.string), address: f(T.string),
      contactPerson: f(T.string), contactPhone: f(T.phone), roomsAndRates: f(T.json), contacts: f(T.json),
    },
    sample: () => ({ name: 'QA Hotel New', city: 'Manali', rating: '3 Star' }),
  },
  {
    id: 'hotels.update', method: 'put', path: '/api/hotels/:id', auth: 'required', permission: ['hotels', 'update'], mutating: true,
    params: { id: 'hotel' }, body: { name: req(T.string), city: req(T.string), rating: f(T.string), address: f(T.string) },
    sample: () => ({ name: 'QA Hotel Updated', city: 'Goa' }),
  },
  { id: 'hotels.remove', method: 'delete', path: '/api/hotels/:id', auth: 'required', permission: ['hotels', 'delete'], params: { id: 'hotel' }, destructive: true },

  // -------------------------------------------------------------- batches
  { id: 'batches.list', method: 'get', path: '/api/batches', auth: 'required', permission: ['tourBatches', 'read'], list: true },
  { id: 'batches.getOne', method: 'get', path: '/api/batches/:id', auth: 'required', permission: ['tourBatches', 'read'], params: { id: 'batch' } },
  {
    id: 'batches.create', method: 'post', path: '/api/batches', auth: 'required', permission: ['tourBatches', 'create'], mutating: true,
    body: {
      name: req(T.string), tripName: req(T.string), departureDate: req(T.date),
      totalCapacity: req(T.int, { min: 0 }), pricePerPerson: f(T.float), status: f(T.string), notes: f(T.text),
    },
    sample: () => ({ name: 'QA Batch New', tripName: 'QA Trip', departureDate: '2026-12-15', totalCapacity: 15, pricePerPerson: 9000 }),
  },
  {
    id: 'batches.update', method: 'put', path: '/api/batches/:id', auth: 'required', permission: ['tourBatches', 'update'], mutating: true,
    params: { id: 'batch' },
    body: { name: req(T.string), tripName: req(T.string), departureDate: req(T.date), totalCapacity: req(T.int, { min: 0 }) },
    sample: () => ({ name: 'QA Batch Updated', tripName: 'QA Trip', departureDate: '2026-12-16', totalCapacity: 18 }),
  },
  { id: 'batches.remove', method: 'delete', path: '/api/batches/:id', auth: 'required', permission: ['tourBatches', 'delete'], params: { id: 'batch' }, destructive: true },
  {
    id: 'batches.link', method: 'post', path: '/api/batches/:id/link', auth: 'required', permission: ['tourBatches', 'update'], mutating: true,
    params: { id: 'batch' }, body: { bookingId: req(T.id), force: f(T.bool) },
    sample: (ctx) => ({ bookingId: ctx.res.A.booking }),
  },
  {
    id: 'batches.unlink', method: 'post', path: '/api/batches/:id/unlink', auth: 'required', permission: ['tourBatches', 'update'], mutating: true,
    params: { id: 'batch' }, body: { bookingId: req(T.id) }, sample: (ctx) => ({ bookingId: ctx.res.A.booking }),
  },
  {
    id: 'batches.linkLead', method: 'post', path: '/api/batches/:id/link-lead', auth: 'required', permission: ['tourBatches', 'update'], mutating: true,
    params: { id: 'batch' }, body: { leadId: req(T.id) }, sample: (ctx) => ({ leadId: ctx.res.A.lead }),
  },
  {
    id: 'batches.unlinkLead', method: 'post', path: '/api/batches/:id/unlink-lead', auth: 'required', permission: ['tourBatches', 'update'], mutating: true,
    params: { id: 'batch' }, body: { leadId: req(T.id) }, sample: (ctx) => ({ leadId: ctx.res.A.lead }),
  },

  // ------------------------------------------------------------- expenses
  // The router gates on billing.write, an action the permission matrix does
  // not define - so only ADMIN can ever get through. Recorded here as it is,
  // and the RBAC rule reports the mismatch rather than hiding it.
  { id: 'expenses.list', method: 'get', path: '/api/expenses', auth: 'required', permission: ['billing', 'write'], list: true },
  {
    id: 'expenses.create', method: 'post', path: '/api/expenses', auth: 'required', permission: ['billing', 'write'], mutating: true,
    body: {
      title: req(T.string), amount: req(T.float, { min: 0 }), category: f(T.string),
      link_type: f(T.string), booking_id: f(T.id), batch_id: f(T.id), vendor_name: f(T.string), status: f(T.string),
    },
    sample: () => ({ title: 'QA Expense', amount: 2500, category: 'Transport', link_type: 'general' }),
  },
  {
    id: 'expenses.update', method: 'put', path: '/api/expenses/:id', auth: 'required', permission: ['billing', 'write'], mutating: true,
    params: { id: 'expense' }, body: { title: f(T.string), amount: f(T.float, { min: 0 }), status: f(T.string) },
    sample: () => ({ title: 'QA Expense Updated', amount: 2600 }),
  },
  { id: 'expenses.remove', method: 'delete', path: '/api/expenses/:id', auth: 'required', permission: ['billing', 'write'], params: { id: 'expense' }, destructive: true },
  { id: 'expenses.templates', method: 'get', path: '/api/expenses/templates', auth: 'required', permission: ['billing', 'write'], list: true },
  {
    id: 'expenses.upsertTemplate', method: 'post', path: '/api/expenses/templates', auth: 'required', permission: ['billing', 'write'], mutating: true,
    body: { name: f(T.string), items: f(T.json) },
    sample: () => ({ name: 'QA Template', items: [{ title: 'Hotel', amount: 1000, category: 'Hotel' }] }),
  },
  { id: 'expenses.deleteTemplate', method: 'delete', path: '/api/expenses/templates/:id', auth: 'required', permission: ['billing', 'write'], params: { id: 'unknownNumeric' }, destructive: true, skipHappy: true },

  // ------------------------------------------------------------ dashboard
  { id: 'dashboard.get', method: 'get', path: '/api/dashboard', auth: 'required', list: true },
  { id: 'dashboard.analytics', method: 'get', path: '/api/dashboard/analytics', auth: 'required', permission: ['billing', 'read'], list: true },

  // ------------------------------------------------------------- invoices
  { id: 'invoices.download', method: 'get', path: '/api/invoices/:bookingId/download', auth: 'required', permission: ['invoices', 'download'], params: { bookingId: 'booking' }, heavy: true },
  {
    id: 'invoices.email', method: 'post', path: '/api/invoices/:bookingId/email', auth: 'required', permission: ['invoices', 'email'],
    params: { bookingId: 'booking' }, body: { to: f(T.email) }, sample: () => ({ to: 'qa.invoice@qa.invalid' }),
    externals: true, heavy: true,
  },

  // ------------------------------------------------------------ customers
  { id: 'customers.list', method: 'get', path: '/api/customers', auth: 'required', permission: ['customers', 'read'], list: true },
  { id: 'customers.lookup', method: 'get', path: '/api/customers/lookup', auth: 'required', permission: ['customers', 'read'], list: true },
  { id: 'customers.getOne', method: 'get', path: '/api/customers/:id', auth: 'required', permission: ['customers', 'read'], params: { id: 'customer' } },

  // ------------------------------------------------------------ follow-ups
  { id: 'followUps.list', method: 'get', path: '/api/follow-ups', auth: 'required', permission: ['followUps', 'read'], list: true },
  { id: 'followUps.listCompleted', method: 'get', path: '/api/follow-ups/completed', auth: 'required', permission: ['followUps', 'read'], list: true },
  {
    id: 'followUps.markDone', method: 'patch', path: '/api/follow-ups/:id/done', auth: 'required', permission: ['followUps', 'update'], mutating: true,
    params: { id: 'followUp' }, body: { note: f(T.text) }, sample: () => ({ note: 'QA done' }),
  },

  // --------------------------------------------------------------- users
  { id: 'users.list', method: 'get', path: '/api/users', auth: 'required', adminOnly: true },
  {
    id: 'users.create', method: 'post', path: '/api/users', auth: 'required', adminOnly: true, mutating: true,
    body: {
      name: req(T.string), email: req(T.email), password: req(T.string, { minLength: 6 }),
      role: req(T.enum, { values: ['ADMIN', 'TEAM_MEMBER'] }), permissions: f(T.json),
    },
    sample: (ctx) => ({ name: 'QA Team Member', email: `${ctx.uniq('member')}@qa.invalid`, password: 'QaPassword123', role: 'TEAM_MEMBER' }),
  },
  {
    id: 'users.update', method: 'put', path: '/api/users/:id', auth: 'required', adminOnly: true, mutating: true,
    params: { id: 'teamUser' },
    body: { name: f(T.string), role: f(T.enum, { values: ['ADMIN', 'TEAM_MEMBER'] }), password: f(T.string, { minLength: 6 }), permissions: f(T.json) },
    sample: () => ({ name: 'QA Member Renamed' }),
  },
  { id: 'users.remove', method: 'delete', path: '/api/users/:id', auth: 'required', adminOnly: true, params: { id: 'teamUser' }, destructive: true },

  // ------------------------------------------------------------- settings
  { id: 'settings.get', method: 'get', path: '/api/settings', auth: 'required' },
  {
    id: 'settings.update', method: 'put', path: '/api/settings', auth: 'required', adminOnly: true, mutating: true,
    body: { companyName: f(T.string), gstNumber: f(T.string), address: f(T.string), invoicePrefix: f(T.string), currency: f(T.string) },
    sample: () => ({ companyName: 'QA Settings Co' }),
  },
  { id: 'settings.leadCaptureKey', method: 'get', path: '/api/settings/lead-capture-key', auth: 'required' },
  { id: 'settings.regenerateLeadKey', method: 'post', path: '/api/settings/lead-capture-key/regenerate', auth: 'required', adminOnly: true, mutating: true, skipHappy: true },
  {
    id: 'settings.whatsappRequest', method: 'post', path: '/api/settings/whatsapp-request', auth: 'required',
    body: { phone: f(T.phone), note: f(T.text) }, sample: (ctx) => ({ phone: ctx.newPhone(), note: 'QA setup request' }),
    externals: true,
  },
  {
    id: 'settings.whatsappEmbedded', method: 'post', path: '/api/settings/whatsapp/embedded-signup', auth: 'required',
    body: { code: req(T.string), wabaId: f(T.string), phoneNumberId: f(T.string) },
    sample: () => ({ code: 'qa-code', wabaId: 'qa-waba', phoneNumberId: 'qa-phone' }),
    externals: true,
  },
  { id: 'settings.whatsappDisconnect', method: 'post', path: '/api/settings/whatsapp/disconnect', auth: 'required', mutating: true },

  // -------------------------------------------------------------- uploads
  { id: 'upload.file', method: 'post', path: '/api/upload', auth: 'required', upload: true, skipHappy: true },

  // ------------------------------------------------------- whatsapp (meta)
  {
    id: 'whatsapp.sendForBooking', method: 'post', path: '/api/whatsapp/:bookingId/send', auth: 'required',
    params: { bookingId: 'booking' }, body: { message: f(T.text), templateName: f(T.string) },
    sample: () => ({ message: 'QA message' }), externals: true,
  },
  { id: 'whatsapp.verifyWebhook', method: 'get', path: '/api/whatsapp/webhook', auth: 'webhook', skipHappy: true },
  { id: 'whatsapp.receiveWebhook', method: 'post', path: '/api/whatsapp/webhook', auth: 'webhook', body: { object: f(T.string), entry: f(T.json) }, sample: () => ({ object: 'whatsapp_business_account', entry: [] }), expectSampleRejected: true },
  { id: 'whatsapp.getChats', method: 'get', path: '/api/whatsapp/chats', auth: 'required', list: true },
  {
    id: 'whatsapp.startChat', method: 'post', path: '/api/whatsapp/chats/start', auth: 'required', mutating: true,
    body: { phone: req(T.phone), customerName: f(T.string) }, sample: (ctx) => ({ phone: ctx.newPhone(), customerName: 'QA Chat' }),
    externals: true,
  },
  { id: 'whatsapp.chatMessages', method: 'get', path: '/api/whatsapp/chats/:chatId/messages', auth: 'required', params: { chatId: 'chat' } },
  {
    id: 'whatsapp.sendChatMessage', method: 'post', path: '/api/whatsapp/chats/:chatId/send', auth: 'required',
    params: { chatId: 'chat' }, body: { message: req(T.text) }, sample: () => ({ message: 'QA chat message' }), externals: true,
  },
  { id: 'whatsapp.readChat', method: 'post', path: '/api/whatsapp/chats/:chatId/read', auth: 'required', params: { chatId: 'chat' }, mutating: true },
  {
    id: 'whatsapp.updateChatManagement', method: 'put', path: '/api/whatsapp/chats/:chatId/management', auth: 'required', mutating: true,
    params: { chatId: 'chat' }, body: { customerName: f(T.string), assignedTo: f(T.string), notes: f(T.text) },
    sample: () => ({ customerName: 'QA Chat Renamed' }),
  },

  // --------------------------------------------------- whatsapp templates
  { id: 'waTemplates.list', method: 'get', path: '/api/whatsapp/templates', auth: 'required', list: true },
  { id: 'waTemplates.lookup', method: 'get', path: '/api/whatsapp/templates/lookup', auth: 'required', list: true },
  {
    id: 'waTemplates.create', method: 'post', path: '/api/whatsapp/templates', auth: 'required', mutating: true,
    body: { name: req(T.string), body: f(T.text), category: f(T.string), language: f(T.string) },
    sample: (ctx) => ({ name: ctx.uniq('qa_template').toLowerCase(), body: 'Hello {{1}}', category: 'MARKETING', language: 'en' }),
  },
  { id: 'waTemplates.sync', method: 'post', path: '/api/whatsapp/templates/sync', auth: 'required', externals: true },
  { id: 'waTemplates.submit', method: 'post', path: '/api/whatsapp/templates/:id/submit', auth: 'required', params: { id: 'unknownNumeric' }, externals: true, skipHappy: true },
  {
    id: 'waTemplates.update', method: 'put', path: '/api/whatsapp/templates/:id', auth: 'required', mutating: true,
    params: { id: 'unknownNumeric' }, body: { body: f(T.text), category: f(T.string) }, sample: () => ({ body: 'QA updated body' }), skipHappy: true,
  },
  { id: 'waTemplates.remove', method: 'delete', path: '/api/whatsapp/templates/:id', auth: 'required', params: { id: 'unknownNumeric' }, destructive: true, skipHappy: true },

  // ------------------------------------------------------- whatsapp (web)
  { id: 'waWeb.status', method: 'get', path: '/api/whatsapp-web/status', auth: 'required' },
  { id: 'waWeb.connect', method: 'post', path: '/api/whatsapp-web/connect', auth: 'required', permission: ['whatsapp', 'manage'], externals: true, heavy: true, skipHappy: true },
  { id: 'waWeb.disconnect', method: 'post', path: '/api/whatsapp-web/disconnect', auth: 'required', permission: ['whatsapp', 'manage'], mutating: true },
  {
    id: 'waWeb.toggleAutopilot', method: 'post', path: '/api/whatsapp-web/toggle-autopilot', auth: 'required', permission: ['whatsapp', 'manage'], mutating: true,
    body: { enabled: req(T.bool) }, sample: () => ({ enabled: false }),
  },
  { id: 'waWeb.listChats', method: 'get', path: '/api/whatsapp-web/chats', auth: 'required', list: true },
  {
    id: 'waWeb.startChat', method: 'post', path: '/api/whatsapp-web/start-chat', auth: 'required', mutating: true,
    body: { phone: req(T.phone), customerName: f(T.string) }, sample: (ctx) => ({ phone: ctx.newPhone(), customerName: 'QA Web Chat' }),
    externals: true,
  },
  { id: 'waWeb.chatMessages', method: 'get', path: '/api/whatsapp-web/chats/:chatId/messages', auth: 'required', params: { chatId: 'chat' } },
  { id: 'waWeb.sendMessage', method: 'post', path: '/api/whatsapp-web/chats/:chatId/send', auth: 'required', params: { chatId: 'chat' }, upload: true, externals: true, skipHappy: true },
  { id: 'waWeb.listTemplates', method: 'get', path: '/api/whatsapp-web/templates', auth: 'required', list: true },
  {
    id: 'waWeb.sendTemplate', method: 'post', path: '/api/whatsapp-web/chats/:chatId/send-template', auth: 'required',
    params: { chatId: 'chat' }, body: { templateName: req(T.string), variables: f(T.json) },
    sample: () => ({ templateName: 'qa_template', variables: [] }), externals: true,
  },
  {
    id: 'waWeb.toggleChatAi', method: 'post', path: '/api/whatsapp-web/chats/:chatId/toggle-ai', auth: 'required', mutating: true,
    params: { chatId: 'chat' }, body: { enabled: req(T.bool) }, sample: () => ({ enabled: false }),
  },
  { id: 'waWeb.aiSuggest', method: 'post', path: '/api/whatsapp-web/chats/:chatId/ai-suggest', auth: 'required', params: { chatId: 'chat' }, externals: true, heavy: true },
  {
    id: 'waWeb.sendItineraryPdf', method: 'post', path: '/api/whatsapp-web/send-itinerary-pdf', auth: 'required',
    body: { chatId: f(T.id), quotationId: f(T.id) }, sample: (ctx) => ({ chatId: ctx.res.A.chat, quotationId: ctx.res.A.quotation }),
    externals: true, heavy: true,
  },
  { id: 'waWeb.quickReplies', method: 'get', path: '/api/whatsapp-web/quick-replies', auth: 'required', list: true },

  // ------------------------------------------------------------------- ai
  { id: 'ai.parse', method: 'post', path: '/api/ai/parse', auth: 'required', permission: ['aiTools', 'use'], upload: true, externals: true, heavy: true, skipHappy: true },
  { id: 'ai.parseItinerary', method: 'post', path: '/api/ai/parse-itinerary', auth: 'required', permission: ['aiTools', 'use'], upload: true, externals: true, heavy: true, skipHappy: true },
  {
    id: 'ai.generateItinerary', method: 'post', path: '/api/ai/generate-itinerary', auth: 'required', permission: ['aiTools', 'use'],
    body: { destination: f(T.string), days: f(T.int), preferences: f(T.text) },
    sample: () => ({ destination: 'Goa', days: 3 }), externals: true, heavy: true,
  },
  {
    id: 'ai.whatsappReply', method: 'post', path: '/api/ai/whatsapp-reply', auth: 'required', permission: ['aiTools', 'use'],
    body: { message: f(T.text), chatId: f(T.id) }, sample: () => ({ message: 'What is the price?' }),
    externals: true, heavy: true,
  },
  {
    id: 'ai.downloadItinerary', method: 'post', path: '/api/ai/download-itinerary', auth: 'required', permission: ['aiTools', 'use'],
    body: { itinerary: f(T.json), title: f(T.string) }, sample: () => ({ itinerary: { days: [] }, title: 'QA Itinerary' }),
    heavy: true,
  },

  // ------------------------------------------------------------ instagram
  { id: 'instagram.auth', method: 'get', path: '/api/instagram/auth', auth: 'required', externals: true, skipHappy: true },
  { id: 'instagram.callback', method: 'get', path: '/api/instagram/callback', auth: 'public', externals: true, skipHappy: true },
  { id: 'instagram.disconnect', method: 'post', path: '/api/instagram/disconnect', auth: 'required', mutating: true },
  { id: 'instagram.verifyWebhook', method: 'get', path: '/api/instagram/webhook', auth: 'webhook', skipHappy: true },
  { id: 'instagram.receiveWebhook', method: 'post', path: '/api/instagram/webhook', auth: 'webhook', body: { object: f(T.string), entry: f(T.json) }, sample: () => ({ object: 'instagram', entry: [] }) },
  {
    id: 'instagramDirect.login', method: 'post', path: '/api/instagram-direct/login', auth: 'required', permission: ['settings', 'update'],
    body: { username: req(T.string), password: req(T.string) }, sample: () => ({ username: 'qa_user', password: 'qa_password' }),
    externals: true, heavy: true, skipHappy: true,
  },
  {
    id: 'instagramDirect.verify', method: 'post', path: '/api/instagram-direct/verify', auth: 'required', permission: ['settings', 'update'],
    body: { code: req(T.string) }, sample: () => ({ code: '123456' }), externals: true, skipHappy: true,
  },
  { id: 'instagramDirect.status', method: 'get', path: '/api/instagram-direct/status', auth: 'required', permission: ['settings', 'read'] },
  { id: 'instagramDirect.disconnect', method: 'post', path: '/api/instagram-direct/disconnect', auth: 'required', permission: ['settings', 'update'], mutating: true },

  // --------------------------------------------------------------- public
  {
    id: 'public.captureLead', method: 'post', path: '/api/public/leads/:publicLeadKey', auth: 'public',
    params: { publicLeadKey: 'leadKey' },
    body: { name: f(T.string), phone: req(T.phone), email: f(T.email), message: f(T.text) },
    sample: (ctx) => ({ name: 'QA Public Lead', phone: ctx.newPhone(), email: 'qa.public@qa.invalid' }),
    mutating: true, rateLimited: 'public',
  },
  {
    id: 'public.walkthrough', method: 'post', path: '/api/public/walkthrough', auth: 'public',
    body: { name: f(T.string), email: f(T.email), phone: f(T.phone), company: f(T.string) },
    sample: (ctx) => ({ name: 'QA Demo', email: 'qa.demo@qa.invalid', phone: ctx.newPhone(), company: 'QA Co' }),
    externals: true, rateLimited: 'public',
  },
  {
    id: 'public.freeItinerary', method: 'post', path: '/api/public/generate-free-itinerary', auth: 'public',
    body: { destination: f(T.string), days: f(T.int), email: f(T.email) },
    sample: () => ({ destination: 'Goa', days: 3, email: 'qa.free@qa.invalid' }),
    externals: true, heavy: true, rateLimited: 'public',
  },
];

export const byId = Object.fromEntries(ENDPOINTS.map((e) => [e.id, e]));

/** Endpoints with at least one :param in the path. */
export const withParams = () => ENDPOINTS.filter((e) => e.path.includes(':'));

/** Endpoints that accept a JSON body worth fuzzing field-by-field. */
export const withBody = () => ENDPOINTS.filter((e) => e.body && Object.keys(e.body).length > 0 && !e.upload);

export const TYPES = T;
