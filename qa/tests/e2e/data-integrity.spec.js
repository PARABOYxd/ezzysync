import { test, expect, unique, uniquePhone, apiJson, daysFromNow } from '../support/fixtures.js';

/**
 * What goes in is what is stored, what is read back, and what is exported.
 *
 * The flow specs prove the screens work; this proves the numbers survive the
 * round trip. Every field sent is compared with what the API returns, every
 * total is recomputed here independently rather than trusted, and the CSV
 * export and the lead import are checked cell by cell against the API.
 *
 * Bookings are created as "Confirming": a "Booked" booking sends the customer
 * a WhatsApp confirmation, and nothing here may message anyone.
 */
test.describe.configure({ mode: 'serial' });

const round2 = (n) => Math.round(n * 100) / 100;

/** The export quotes every cell, so a small parser is enough - and exact. */
function parseCsv(text) {
  const rows = [];
  for (const line of text.split('\n').filter(Boolean)) {
    const cells = [];
    const re = /"((?:[^"]|"")*)"|([^,]+)|(?<=,)(?=,|$)|^(?=,)/g;
    let m;
    while ((m = re.exec(line)) !== null) {
      if (m.index === re.lastIndex) re.lastIndex += 1;
      cells.push(m[1] !== undefined ? m[1].replace(/""/g, '"') : (m[2] ?? ''));
    }
    rows.push(cells);
  }
  return rows;
}

const FULL_BOOKING = () => ({
  customerName: unique('QA Integrity'),
  email: 'integrity@ezzysync.test',
  phone: uniquePhone(),
  emergencyContact: '9811100000',
  trip: 'Kashmir 5N/6D Integrity',
  departure: daysFromNow(30),
  pickup: 'Srinagar Airport',
  members: 3,
  pricePerPerson: 12345.5,
  travelStatus: 'Confirming',
  notes: 'Needs a ground-floor room, "no stairs"',
  vendorHotelCost: 10000,
  vendorFlightCost: 5000,
  vendorTransportCost: 2000.25,
  vendorOtherCost: 500,
  roomCategory: 'Deluxe Houseboat',
  mealPlan: 'MAP',
  hotelConfirmationNo: 'QA-HB-771',
  hotelCheckIn: daysFromNow(30),
  hotelCheckOut: daysFromNow(32),
  vehicleType: 'Innova Crysta',
  driverName: 'QA Driver',
  driverPhone: '9811100001',
  vehicleNumber: 'JK-01-QA-1234',
  pickupTime: '10:30 AM',
  pickupLocation: 'Srinagar Airport',
  dropLocation: 'Srinagar Airport',
  voucherNotes: 'Shikara ride on day 2',
});

test.describe('Data integrity', () => {
  let booking;
  let sent;

  test('a booking stores every field exactly and computes its own totals', async ({ api }) => {
    sent = FULL_BOOKING();
    const { booking: created } = await apiJson(await api.post('bookings', { data: sent }), 201);
    booking = created;

    const { booking: stored } = await apiJson(await api.get(`bookings/${booking.bookingId}`), 200);
    for (const [key, value] of Object.entries(sent)) {
      if (key === 'phone') expect(stored.phone, key).toContain(value);
      else if (typeof value === 'number') expect(Number(stored[key]), key).toBe(value);
      else expect(String(stored[key] ?? '').slice(0, value.length), key).toBe(value);
    }

    const total = round2(3 * 12345.5);
    const cost = 10000 + 5000 + 2000.25 + 500;
    expect(Number(stored.totalAmount)).toBe(total);
    expect(Number(stored.paid)).toBe(0);
    expect(Number(stored.remaining)).toBe(total);
    expect(Number(stored.netProfit)).toBe(round2(total - cost));
    expect(stored.paymentStatus).toBe('Pending');

    // And it is in the list the Bookings page reads, with the same numbers.
    const list = await apiJson(await api.get('bookings', { params: { search: sent.customerName } }), 200);
    const row = (list.bookings || list.data || []).find((b) => b.bookingId === booking.bookingId);
    expect(row, 'booking missing from the list').toBeTruthy();
    expect(Number(row.totalAmount)).toBe(total);
  });

  test('payments add up exactly, move the status, and removing one puts the money back', async ({ api }) => {
    const total = round2(3 * 12345.5);
    const first = await apiJson(await api.post(`bookings/${booking.bookingId}/payments`, {
      data: { amount: 10000, method: 'UPI', reference: 'QA-UTR-A', paidOn: daysFromNow(0) },
    }), 201);
    expect(first.paid).toBe(10000);
    expect(first.remaining).toBe(round2(total - 10000));
    expect(first.paymentStatus).toBe('Partial');

    const rest = round2(total - 10000);
    const second = await apiJson(await api.post(`bookings/${booking.bookingId}/payments`, {
      data: { amount: rest, method: 'Bank Transfer', reference: 'QA-UTR-B', paidOn: daysFromNow(0) },
    }), 201);
    expect(second.paid).toBe(total);
    expect(second.remaining).toBe(0);
    expect(second.paymentStatus).toBe('Paid');

    const { payments } = await apiJson(await api.get(`bookings/${booking.bookingId}/payments`), 200);
    expect(payments).toHaveLength(2);
    expect(round2(payments.reduce((s, p) => s + Number(p.amount), 0))).toBe(total);
    expect(payments.map((p) => p.reference).sort()).toEqual(['QA-UTR-A', 'QA-UTR-B']);

    const firstPayment = payments.find((p) => p.reference === 'QA-UTR-A');
    await apiJson(await api.delete(`bookings/${booking.bookingId}/payments/${firstPayment.id}`), 200);
    const { booking: after } = await apiJson(await api.get(`bookings/${booking.bookingId}`), 200);
    expect(Number(after.paid)).toBe(rest);
    expect(Number(after.remaining)).toBe(10000);
    expect(after.paymentStatus).toBe('Partial');
  });

  test('changing travellers recomputes total, balance and profit, and keeps the payments', async ({ api }) => {
    const paidBefore = round2(3 * 12345.5 - 10000);
    await apiJson(await api.put(`bookings/${booking.bookingId}`, { data: { members: 4 } }), 200);

    const { booking: stored } = await apiJson(await api.get(`bookings/${booking.bookingId}`), 200);
    const total = round2(4 * 12345.5);
    expect(Number(stored.totalAmount)).toBe(total);
    expect(Number(stored.paid)).toBe(paidBefore);
    expect(Number(stored.remaining)).toBe(round2(total - paidBefore));
    expect(Number(stored.netProfit)).toBe(round2(total - (10000 + 5000 + 2000.25 + 500)));
    // A partial update leaves everything else as it was.
    expect(stored.customerName).toBe(sent.customerName);
    expect(stored.driverName).toBe(sent.driverName);
    expect(Number(stored.vendorTransportCost)).toBe(2000.25);

    const { payments } = await apiJson(await api.get(`bookings/${booking.bookingId}/payments`), 200);
    expect(payments).toHaveLength(1);
  });

  test('the dashboard moves by exactly what a new booking and its payment add', async ({ api }) => {
    const before = (await apiJson(await api.get('dashboard'), 200)).stats;
    const data = { ...FULL_BOOKING(), members: 2, pricePerPerson: 20000, vendorHotelCost: 15000, vendorFlightCost: 0, vendorTransportCost: 4000, vendorOtherCost: 1000 };
    const { booking: b } = await apiJson(await api.post('bookings', { data }), 201);
    await apiJson(await api.post(`bookings/${b.bookingId}/payments`, { data: { amount: 7500, method: 'Cash' } }), 201);

    const after = (await apiJson(await api.get('dashboard'), 200)).stats;
    expect(after.totalBookings - before.totalBookings).toBe(1);
    expect(round2(after.totalRevenue - before.totalRevenue)).toBe(40000);
    expect(round2(after.totalPaid - before.totalPaid)).toBe(7500);
    expect(round2(after.totalCost - before.totalCost)).toBe(20000);
    expect(round2(after.totalProfit - before.totalProfit)).toBe(20000);

    // Cancelling takes it back out of every money figure, and only counts it as cancelled.
    await apiJson(await api.put(`bookings/${b.bookingId}`, { data: { travelStatus: 'Cancelled' } }), 200);
    const cancelled = (await apiJson(await api.get('dashboard'), 200)).stats;
    expect(round2(cancelled.totalRevenue)).toBe(round2(before.totalRevenue));
    expect(round2(cancelled.totalPaid)).toBe(round2(before.totalPaid));
    expect(cancelled.cancelledTrips - before.cancelledTrips).toBe(1);
  });

  test('the CSV export has every booking, the same values the API returns, and totals that match the dashboard', async ({ api }) => {
    const res = await api.get('bookings/export/csv');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/csv');
    const [header, ...rows] = parseCsv(await res.text());
    expect(header).toEqual([
      'Booking ID', 'Customer', 'Email', 'Phone', 'Trip', 'Departure', 'Members',
      'Total Amount', 'Paid', 'Remaining', 'Travel Status', 'Payment Status',
    ]);

    const list = await apiJson(await api.get('bookings', { params: { limit: 500 } }), 200);
    const all = list.bookings || list.data || [];
    expect(rows).toHaveLength(list.total ?? list.pagination?.total ?? all.length);

    const { booking: stored } = await apiJson(await api.get(`bookings/${booking.bookingId}`), 200);
    const row = rows.find((r) => r[0] === booking.bookingId);
    expect(row, 'booking missing from the export').toBeTruthy();
    expect(row.slice(1, 7)).toEqual([stored.customerName, stored.email, stored.phone, stored.trip, stored.departure, String(stored.members)]);
    expect(Number(row[7])).toBe(Number(stored.totalAmount));
    expect(Number(row[8])).toBe(Number(stored.paid));
    expect(Number(row[9])).toBe(Number(stored.remaining));
    expect(row.slice(10)).toEqual([stored.travelStatus, stored.paymentStatus]);

    const active = rows.filter((r) => r[10] !== 'Cancelled');
    const stats = (await apiJson(await api.get('dashboard'), 200)).stats;
    expect(round2(active.reduce((s, r) => s + Number(r[7]), 0))).toBe(round2(stats.totalRevenue));
    expect(round2(active.reduce((s, r) => s + Number(r[8]), 0))).toBe(round2(stats.totalPaid));
  });

  test('a customer name written as a spreadsheet formula is exported as text, not a formula', async ({ api }) => {
    const name = '=HYPERLINK("http://qa.invalid","Click")';
    const { booking: b } = await apiJson(await api.post('bookings', { data: { ...FULL_BOOKING(), customerName: name } }), 201);
    const rows = parseCsv(await (await api.get('bookings/export/csv')).text());
    const row = rows.find((r) => r[0] === b.bookingId);
    expect(row[1]).toBe(`'${name}`);
    // The stored name itself is untouched - only the export is neutralised.
    const { booking: stored } = await apiJson(await api.get(`bookings/${b.bookingId}`), 200);
    expect(stored.customerName).toBe(name);
  });

  test('the invoice downloads as a real PDF for the booking', async ({ api }) => {
    const res = await api.get(`invoices/${booking.bookingId}/download`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/pdf');
    const body = await res.body();
    expect(body.subarray(0, 5).toString()).toBe('%PDF-');
    expect(body.length).toBeGreaterThan(1000);
  });

  test('a quotation stores its whole day plan, and the public link shows the same trip', async ({ api, request }) => {
    const data = {
      customerName: unique('QA Quote'), phone: uniquePhone(), email: 'quote@ezzysync.test',
      tripName: 'Andaman 4N/5D Integrity', priceQuote: 74250, validUntil: daysFromNow(10), status: 'Draft',
      itineraryDays: [
        { day: 1, title: 'Day 1: Port Blair', description: 'Cellular Jail, light & sound show' },
        { day: 2, title: 'Day 2: Havelock', description: 'Radhanagar beach, "sunset"' },
        { day: 3, title: 'Day 3: Scuba', description: 'Elephant beach dive' },
      ],
      inclusions: ['4N hotels', 'Ferries'], exclusions: ['Flights'], highlights: ['Scuba dive'],
      hotelCostPerPax: 17000, flightCostPerPax: 0, transportCostPerPax: 7000, otherCostPerPax: 5000,
    };
    const { quotation: created } = await apiJson(await api.post('quotations', { data }), 201);
    const { quotation: stored } = await apiJson(await api.get(`quotations/${created.quotationId}`), 200);

    for (const key of ['customerName', 'email', 'tripName', 'validUntil', 'status']) expect(stored[key], key).toBe(data[key]);
    for (const key of ['priceQuote', 'hotelCostPerPax', 'flightCostPerPax', 'transportCostPerPax', 'otherCostPerPax']) expect(Number(stored[key]), key).toBe(data[key]);
    expect(stored.phone).toContain(data.phone);
    expect(stored.itineraryDays.map(({ day, title, description }) => ({ day, title, description }))).toEqual(data.itineraryDays);
    expect(stored.inclusions).toEqual(data.inclusions);
    expect(stored.exclusions).toEqual(data.exclusions);
    expect(stored.highlights).toEqual(data.highlights);

    // The page a customer opens, without any login.
    const pub = await request.get(`${process.env.API_URL || 'http://localhost:5001/api'}/quotations/public/${created.id}`);
    const { quotation: shared } = await apiJson(pub, 200);
    expect(shared.tripName).toBe(data.tripName);
    expect(Number(shared.priceQuote)).toBe(data.priceQuote);
    expect(shared.itineraryDays.map((d) => d.title)).toEqual(data.itineraryDays.map((d) => d.title));
  });

  test('importing a CSV stores every cell as the right lead field, and importing it again adds nothing', async ({ api }) => {
    const people = [
      { name: unique('QA Import One'), phone: uniquePhone(), email: 'one@ezzysync.test', trip: 'Kerala 5N', pax: 4, date: '15/11/2026', iso: '2026-11-15', notes: 'Wants a houseboat, and a pool' },
      { name: unique('QA Import Two'), phone: uniquePhone(), email: 'two@ezzysync.test', trip: 'Goa 3N', pax: 2, date: '01/12/2026', iso: '2026-12-01', notes: 'Honeymoon "special"' },
    ];
    const csv = [
      'Name,Phone,Email,Destination,Pax,Travel Date,Notes',
      ...people.map((p) => [p.name, p.phone, p.email, p.trip, p.pax, p.date, `"${p.notes.replace(/"/g, '""')}"`].join(',')),
    ].join('\n');

    const preview = await apiJson(await api.post('leads/import/preview', {
      multipart: { file: { name: 'qa-leads.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) } },
    }), 200);
    expect(preview.totalRows).toBe(2);
    expect(preview.columns).toEqual(['Name', 'Phone', 'Email', 'Destination', 'Pax', 'Travel Date', 'Notes']);
    // The headings an agency uses are recognised without the user mapping them.
    expect(Number(preview.mapping.customerName)).toBe(0);
    expect(Number(preview.mapping.phone)).toBe(1);

    const mapping = { customerName: 0, phone: 1, email: 2, interest: 3, travelers: 4, departureDate: 5, notes: 6 };
    const dry = await apiJson(await api.post('leads/import/analyze', { data: { rows: preview.rows, mapping } }), 200);
    expect(dry.valid).toBe(2);
    expect(dry.invalid).toBe(0);

    const run = await apiJson(await api.post('leads/import', { data: { rows: preview.rows, mapping } }), 201);
    expect(run.imported).toBe(2);
    expect(run.skippedDuplicates).toBe(0);

    for (const p of people) {
      const { leads } = await apiJson(await api.get('leads', { params: { search: p.phone } }), 200);
      expect(leads, `${p.name} not imported exactly once`).toHaveLength(1);
      const lead = leads[0];
      expect(lead.customerName).toBe(p.name);
      expect(lead.phone).toContain(p.phone);
      expect(lead.email).toBe(p.email);
      expect(lead.interest).toBe(p.trip);
      expect(Number(lead.travelers)).toBe(p.pax);
      expect(lead.departureDate).toBe(p.iso);
      expect(lead.notes).toContain(p.notes);
    }

    const again = await apiJson(await api.post('leads/import', { data: { rows: preview.rows, mapping } }), 201);
    expect(again.imported).toBe(0);
    expect(again.skippedDuplicates).toBe(2);
    for (const p of people) {
      const { leads } = await apiJson(await api.get('leads', { params: { search: p.phone } }), 200);
      expect(leads).toHaveLength(1);
    }
  });
});
