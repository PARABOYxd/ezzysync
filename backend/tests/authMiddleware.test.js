jest.mock('../repositories/userRepository');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userRepository = require('../repositories/userRepository');
const { requireAuth } = require('../middleware/authMiddleware');

function signToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '1h' });
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('requireAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects a request with no Authorization header', async () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
    expect(userRepository.findUserById).not.toHaveBeenCalled();
  });

  it('rejects a malformed/invalid token', async () => {
    const req = { headers: { authorization: 'Bearer not-a-real-jwt' } };
    const res = mockRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a token whose user no longer exists in the DB (e.g. deleted mid-session)', async () => {
    userRepository.findUserById.mockResolvedValue(undefined);
    const token = signToken({ userId: 'ghost-user', tenantId: 't1' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('builds req.user from the LIVE DB row, not the (possibly stale) JWT claims', async () => {
    // The JWT was issued while this user was still TEAM_MEMBER with no permissions -
    // the DB has since been updated by an admin. requireAuth must reflect the DB, live.
    userRepository.findUserById.mockResolvedValue({
      id: 'u1',
      tenant_id: 't1',
      email: 'member@agency.test',
      name: 'Team Member',
      role: 'ADMIN', // promoted to ADMIN after the token was issued
      permissions: null,
      company_name: 'Agency Co',
      plan_id: 'PRO',
    });
    const token = signToken({
      userId: 'u1',
      tenantId: 't1',
      role: 'TEAM_MEMBER',
      permissions: { leads: { create: false } },
    });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user.role).toBe('ADMIN');
    expect(req.user.permissions.leads.create).toBe(true); // admin override, not the stale JWT value
    expect(req.user.tenantId).toBe('t1'); // tenantId still trusted from the signed JWT
  });

  it('normalizes a TEAM_MEMBER permissions object from the DB (module.action shape)', async () => {
    userRepository.findUserById.mockResolvedValue({
      id: 'u2',
      tenant_id: 't1',
      email: 'member2@agency.test',
      name: 'Restricted Member',
      role: 'TEAM_MEMBER',
      permissions: { leads: { create: true, read: true, update: true, delete: false }, hotels: { create: false } },
      company_name: 'Agency Co',
      plan_id: 'FREE',
    });
    const token = signToken({ userId: 'u2', tenantId: 't1' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user.role).toBe('TEAM_MEMBER');
    expect(req.user.permissions.leads.delete).toBe(false);
    expect(req.user.permissions.hotels.create).toBe(false);
    // Modules not explicitly stored still fall back to TEAM_MEMBER_DEFAULTS
    expect(req.user.permissions.quotations.read).toBe(true);
  });

  it('re-reads permissions fresh on every call - toggling access between two requests is honored without re-login', async () => {
    const token = signToken({ userId: 'u3', tenantId: 't1' });
    const req1 = { headers: { authorization: `Bearer ${token}` } };
    const req2 = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    userRepository.findUserById.mockResolvedValueOnce({
      id: 'u3', tenant_id: 't1', role: 'TEAM_MEMBER', permissions: { hotels: { delete: false } },
    });
    await requireAuth(req1, res, next);
    expect(req1.user.permissions.hotels.delete).toBe(false);

    // Admin flips the permission in the DB; same still-valid token, next request.
    userRepository.findUserById.mockResolvedValueOnce({
      id: 'u3', tenant_id: 't1', role: 'TEAM_MEMBER', permissions: { hotels: { delete: true } },
    });
    await requireAuth(req2, res, next);
    expect(req2.user.permissions.hotels.delete).toBe(true);
  });
});
