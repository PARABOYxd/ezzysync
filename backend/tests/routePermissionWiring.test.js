// End-to-end (within the process) check that every route file actually wires
// requirePermission(module, action) onto the right HTTP verb/path - i.e. that
// the plumbing described in backend/config/permissions.js is really connected,
// not just that the middleware function itself works in isolation (see
// permissionMiddleware.test.js for that). authMiddleware, body validation and
// the real controllers are all replaced with lightweight stand-ins so these
// tests never touch a real database - only the requirePermission gate on each
// route is exercised.
const request = require('supertest');
const express = require('express');

const state = { user: null };

function setUser(u) {
  state.user = u;
}

function admin() {
  return { role: 'ADMIN', tenantId: 't1', userId: 'admin-1', name: 'Admin', permissions: {} };
}

function member(permissions) {
  return { role: 'TEAM_MEMBER', tenantId: 't1', userId: 'member-1', name: 'Member', permissions };
}

jest.mock('../middleware/authMiddleware', () => ({
  requireAuth: (req, res, next) => {
    req.user = state.user;
    next();
  },
}));

jest.mock('../middleware/validate', () => ({
  validate: (req, res, next) => next(),
}));

// restrictPhoneEdit (used by bookingRoutes) pulls in the real bookingService,
// which would otherwise reach for a live DB connection.
jest.mock('../services/bookingService');

jest.mock('../controllers/leadController', () => ({
  list: (req, res) => res.json({ hit: 'list' }),
  pipeline: (req, res) => res.json({ hit: 'pipeline' }),
  getOne: (req, res) => res.json({ hit: 'getOne' }),
  create: (req, res) => res.json({ hit: 'create' }),
  update: (req, res) => res.json({ hit: 'update' }),
  updateStage: (req, res) => res.json({ hit: 'updateStage' }),
  convert: (req, res) => res.json({ hit: 'convert' }),
  remove: (req, res) => res.json({ hit: 'remove' }),
  listFollowUps: (req, res) => res.json({ hit: 'listFollowUps' }),
  createFollowUp: (req, res) => res.json({ hit: 'createFollowUp' }),
}));

jest.mock('../controllers/bookingController', () => ({
  list: (req, res) => res.json({ hit: 'list' }),
  exportCSV: (req, res) => res.json({ hit: 'exportCSV' }),
  getOne: (req, res) => res.json({ hit: 'getOne' }),
  create: (req, res) => res.json({ hit: 'create' }),
  update: (req, res) => res.json({ hit: 'update' }),
  remove: (req, res) => res.json({ hit: 'remove' }),
  listFollowUps: (req, res) => res.json({ hit: 'listFollowUps' }),
  createFollowUp: (req, res) => res.json({ hit: 'createFollowUp' }),
}));

jest.mock('../controllers/hotelController', () => ({
  listHotels: (req, res) => res.json({ hit: 'listHotels' }),
  getHotelById: (req, res) => res.json({ hit: 'getHotelById' }),
  createHotel: (req, res) => res.json({ hit: 'createHotel' }),
  updateHotel: (req, res) => res.json({ hit: 'updateHotel' }),
  deleteHotel: (req, res) => res.json({ hit: 'deleteHotel' }),
}));

jest.mock('../controllers/quotationController', () => ({
  list: (req, res) => res.json({ hit: 'list' }),
  getOne: (req, res) => res.json({ hit: 'getOne' }),
  getPublic: (req, res) => res.json({ hit: 'getPublic' }),
  create: (req, res) => res.json({ hit: 'create' }),
  update: (req, res) => res.json({ hit: 'update' }),
  deleteQuote: (req, res) => res.json({ hit: 'deleteQuote' }),
  accept: (req, res) => res.json({ hit: 'accept' }),
  getDashboardStats: (req, res) => res.json({ hit: 'getDashboardStats' }),
  duplicate: (req, res) => res.json({ hit: 'duplicate' }),
}));

function buildApp(routerModulePath) {
  const app = express();
  app.use(express.json());
  app.use('/', require(routerModulePath));
  return app;
}

const leadApp = buildApp('../routes/leadRoutes');
const bookingApp = buildApp('../routes/bookingRoutes');
const hotelApp = buildApp('../routes/hotelRoutes');
const quotationApp = buildApp('../routes/quotationRoutes');

describe('Lead routes - permission wiring', () => {
  it('ADMIN can hit every gated action regardless of their permissions object', async () => {
    setUser(admin());
    await request(leadApp).get('/').expect(200);
    await request(leadApp).post('/').send({ customerName: 'x', phone: '9876543210' }).expect(200);
    await request(leadApp).put('/lead1').expect(200);
    await request(leadApp).delete('/lead1').expect(200);
  });

  it('TEAM_MEMBER: leads.create gates POST /', async () => {
    setUser(member({ leads: { create: false } }));
    await request(leadApp).post('/').send({ customerName: 'x', phone: '9876543210' }).expect(403);

    setUser(member({ leads: { create: true } }));
    await request(leadApp).post('/').send({ customerName: 'x', phone: '9876543210' }).expect(200);
  });

  it('TEAM_MEMBER: leads.delete gates DELETE /:id', async () => {
    setUser(member({ leads: { delete: false } }));
    await request(leadApp).delete('/lead1').expect(403);

    setUser(member({ leads: { delete: true } }));
    await request(leadApp).delete('/lead1').expect(200);
  });

  it('TEAM_MEMBER: leads.read gates every read route', async () => {
    setUser(member({ leads: { read: false } }));
    await request(leadApp).get('/').expect(403);
    await request(leadApp).get('/pipeline').expect(403);
    await request(leadApp).get('/lead1').expect(403);
    await request(leadApp).get('/lead1/follow-ups').expect(403);
  });

  it('TEAM_MEMBER: leads.update gates edit/stage/convert/follow-up-create', async () => {
    setUser(member({ leads: { update: false } }));
    await request(leadApp).put('/lead1').expect(403);
    await request(leadApp).patch('/lead1/stage').expect(403);
    await request(leadApp).post('/lead1/convert').expect(403);
    await request(leadApp).post('/lead1/follow-ups').expect(403);

    setUser(member({ leads: { update: true } }));
    await request(leadApp).put('/lead1').expect(200);
    await request(leadApp).patch('/lead1/stage').expect(200);
    await request(leadApp).post('/lead1/convert').expect(200);
    await request(leadApp).post('/lead1/follow-ups').expect(200);
  });
});

describe('Booking routes - permission wiring', () => {
  it('ADMIN can hit every gated action', async () => {
    setUser(admin());
    await request(bookingApp).get('/').expect(200);
    await request(bookingApp).get('/export/csv').expect(200);
    await request(bookingApp).post('/').send({ phone: '9876543210' }).expect(200);
    await request(bookingApp).delete('/b1').expect(200);
  });

  it('TEAM_MEMBER: bookings.delete gates DELETE /:id', async () => {
    setUser(member({ bookings: { delete: false } }));
    await request(bookingApp).delete('/b1').expect(403);

    setUser(member({ bookings: { delete: true } }));
    await request(bookingApp).delete('/b1').expect(200);
  });

  it('TEAM_MEMBER: bookings.create gates POST /', async () => {
    setUser(member({ bookings: { create: false } }));
    await request(bookingApp).post('/').send({}).expect(403);

    setUser(member({ bookings: { create: true } }));
    await request(bookingApp).post('/').send({}).expect(200);
  });

  it('TEAM_MEMBER: bookings.read gates every read route including CSV export', async () => {
    setUser(member({ bookings: { read: false } }));
    await request(bookingApp).get('/').expect(403);
    await request(bookingApp).get('/export/csv').expect(403);
    await request(bookingApp).get('/b1').expect(403);
    await request(bookingApp).get('/b1/follow-ups').expect(403);
  });
});

describe('Hotel routes - permission wiring (previously had NO gating at all)', () => {
  it('ADMIN can hit every action', async () => {
    setUser(admin());
    await request(hotelApp).get('/').expect(200);
    await request(hotelApp).post('/').send({ name: 'Taj', city: 'Goa' }).expect(200);
    await request(hotelApp).put('/h1').send({ name: 'Taj', city: 'Goa' }).expect(200);
    await request(hotelApp).delete('/h1').expect(200);
  });

  it('TEAM_MEMBER with an empty permissions object is blocked from every hotel action', async () => {
    setUser(member({}));
    await request(hotelApp).get('/').expect(403);
    await request(hotelApp).post('/').send({ name: 'Taj', city: 'Goa' }).expect(403);
    await request(hotelApp).put('/h1').send({ name: 'Taj', city: 'Goa' }).expect(403);
    await request(hotelApp).delete('/h1').expect(403);
  });

  it('TEAM_MEMBER granted only hotels.read can view but not mutate', async () => {
    setUser(member({ hotels: { read: true, create: false, update: false, delete: false } }));
    await request(hotelApp).get('/').expect(200);
    await request(hotelApp).post('/').send({ name: 'Taj', city: 'Goa' }).expect(403);
    await request(hotelApp).put('/h1').send({ name: 'Taj', city: 'Goa' }).expect(403);
    await request(hotelApp).delete('/h1').expect(403);
  });
});

describe('Quotation routes - permission wiring (previously had NO gating at all)', () => {
  it('ADMIN can hit every action', async () => {
    setUser(admin());
    await request(quotationApp).get('/').expect(200);
    await request(quotationApp).post('/').send({ tripName: 'Goa Trip' }).expect(200);
    await request(quotationApp).delete('/q1').expect(200);
    await request(quotationApp).post('/q1/duplicate').expect(200);
  });

  it('TEAM_MEMBER: quotations.delete gates DELETE, quotations.create gates duplicate', async () => {
    setUser(member({ quotations: { read: true, create: false, update: true, delete: false } }));
    await request(quotationApp).delete('/q1').expect(403);
    await request(quotationApp).post('/q1/duplicate').expect(403);
    // "accept" (marking a quote accepted) is gated on update, which this member has
    await request(quotationApp).post('/q1/accept').expect(200);
  });

  it('TEAM_MEMBER with no quotations permissions at all is blocked from everything', async () => {
    setUser(member({}));
    await request(quotationApp).get('/').expect(403);
    await request(quotationApp).post('/').send({ tripName: 'Goa Trip' }).expect(403);
  });
});
