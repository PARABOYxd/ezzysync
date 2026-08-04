jest.mock('../services/bookingService');
const bookingService = require('../services/bookingService');
const { requirePermission, restrictPhoneEdit } = require('../middleware/permissionMiddleware');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('requirePermission middleware', () => {
  it('lets an ADMIN through regardless of their permissions object', () => {
    const mw = requirePermission('leads', 'delete');
    const req = { user: { role: 'ADMIN', permissions: {} } };
    const res = mockRes();
    const next = jest.fn();

    mw(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('lets a TEAM_MEMBER through when the specific module.action is true', () => {
    const mw = requirePermission('hotels', 'create');
    const req = { user: { role: 'TEAM_MEMBER', permissions: { hotels: { create: true } } } };
    const res = mockRes();
    const next = jest.fn();

    mw(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('blocks a TEAM_MEMBER with a 403 when the module.action is false', () => {
    const mw = requirePermission('leads', 'delete');
    const req = { user: { role: 'TEAM_MEMBER', permissions: { leads: { delete: false } } } };
    const res = mockRes();
    const next = jest.fn();

    mw(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('do not have permission') })
    );
  });

  it('blocks a TEAM_MEMBER with a 403 when the module/action is entirely absent from permissions', () => {
    const mw = requirePermission('billing', 'read');
    const req = { user: { role: 'TEAM_MEMBER', permissions: {} } };
    const res = mockRes();
    const next = jest.fn();

    mw(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('checks the exact module/action pair - having a different action on the same module does not grant access', () => {
    const mw = requirePermission('quotations', 'delete');
    const req = { user: { role: 'TEAM_MEMBER', permissions: { quotations: { create: true, read: true, update: true, delete: false } } } };
    const res = mockRes();
    const next = jest.fn();

    mw(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('restrictPhoneEdit middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lets an ADMIN through without touching bookingService', async () => {
    const req = { user: { role: 'ADMIN', permissions: {} }, body: { phone: '9999999999' }, params: { id: 'b1' } };
    const res = mockRes();
    const next = jest.fn();

    await restrictPhoneEdit(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(bookingService.getBookingById).not.toHaveBeenCalled();
  });

  it('lets a TEAM_MEMBER with bookings.editPhone through without a DB lookup', async () => {
    const req = {
      user: { role: 'TEAM_MEMBER', permissions: { bookings: { editPhone: true } } },
      body: { phone: '9999999999' },
      params: { id: 'b1' },
    };
    const res = mockRes();
    const next = jest.fn();

    await restrictPhoneEdit(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(bookingService.getBookingById).not.toHaveBeenCalled();
  });

  it('lets a TEAM_MEMBER without editPhone through when the request has no phone field', async () => {
    const req = {
      user: { role: 'TEAM_MEMBER', permissions: { bookings: { editPhone: false } } },
      body: { customerName: 'New Name' },
      params: { id: 'b1' },
    };
    const res = mockRes();
    const next = jest.fn();

    await restrictPhoneEdit(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('lets a TEAM_MEMBER without editPhone through when the phone is unchanged from the existing record', async () => {
    bookingService.getBookingById.mockResolvedValue({ phone: '9876543210' });
    const req = {
      user: { role: 'TEAM_MEMBER', permissions: { bookings: { editPhone: false } } },
      body: { phone: '9876543210' },
      params: { id: 'b1' },
      tenantId: 't1',
    };
    const res = mockRes();
    const next = jest.fn();

    await restrictPhoneEdit(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('blocks a TEAM_MEMBER without editPhone from actually changing the phone number', async () => {
    bookingService.getBookingById.mockResolvedValue({ phone: '9876543210' });
    const req = {
      user: { role: 'TEAM_MEMBER', permissions: { bookings: { editPhone: false } } },
      body: { phone: '1111111111' },
      params: { id: 'b1' },
    };
    const res = mockRes();
    const next = jest.fn();

    await restrictPhoneEdit(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('forwards unexpected errors to next(err) instead of throwing', async () => {
    const boom = new Error('db down');
    bookingService.getBookingById.mockRejectedValue(boom);
    const req = {
      user: { role: 'TEAM_MEMBER', permissions: { bookings: { editPhone: false } } },
      body: { phone: '1111111111' },
      params: { id: 'b1' },
    };
    const res = mockRes();
    const next = jest.fn();

    await restrictPhoneEdit(req, res, next);

    expect(next).toHaveBeenCalledWith(boom);
    expect(res.status).not.toHaveBeenCalled();
  });
});
