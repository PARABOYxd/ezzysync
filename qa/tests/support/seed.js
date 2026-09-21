import { apiJson, uniquePhone, unique, daysFromNow } from './fixtures.js';

export async function createBooking(api, overrides = {}) {
  const body = {
    customerName: unique('QA Customer'),
    phone: uniquePhone(),
    trip: unique('QA Trip'),
    departure: daysFromNow(20),
    members: 2,
    pricePerPerson: 10000,
    paid: 0,
    travelStatus: 'Confirming',
    ...overrides,
  };
  const res = await api.post('bookings', { data: body });
  const { booking } = await apiJson(res, 201);
  return booking;
}

export async function cancelBooking(api, bookingId) {
  const res = await api.put(`bookings/${bookingId}`, { data: { travelStatus: 'Cancelled' } });
  return apiJson(res, 200);
}

export async function getDashboard(api) {
  return apiJson(await api.get('dashboard'), 200);
}

export async function getBilling(api, params = {}) {
  return apiJson(await api.get('dashboard/analytics', { params }), 200);
}

export async function createLead(api, overrides = {}) {
  const res = await api.post('leads', {
    data: { customerName: unique('QA Lead'), phone: uniquePhone(), source: 'Website', stage: 'New', ...overrides },
  });
  const { lead } = await apiJson(res, 201);
  return lead;
}
