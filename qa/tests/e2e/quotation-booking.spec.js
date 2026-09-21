import { test, expect, expectToast, drawer, unique, apiJson, inr, daysFromNow } from '../support/fixtures.js';
import { createLead } from '../support/seed.js';

test.describe.configure({ mode: 'serial' });

test.describe('Quotation to booking', () => {
  const tripName = unique('QA Kerala Backwaters 5N6D');
  const price = 27500;
  let quotation;
  let lead;

  test('quotation form requires a trip name', async ({ page }) => {
    await page.goto('/quotations');
    await page.getByRole('button', { name: /Create Quotation/ }).click();
    const form = drawer(page, 'Create Itinerary');
    await form.getByRole('button', { name: 'Create Itinerary' }).click();
    await expect(form.getByText('Trip / Package name is required.')).toBeVisible();
  });

  test('creates a quotation with a price and a day plan; stored exactly', async ({ page, api }) => {
    await page.goto('/quotations');
    await page.getByRole('button', { name: /Create Quotation/ }).click();
    const form = drawer(page, 'Create Itinerary');
    await form.getByLabel('Trip / Itinerary Name').fill(tripName);
    await form.getByLabel('Package Price (₹)').fill(String(price));
    await form.getByLabel('Day Title / Milestone').first().fill('Arrival in Kochi');

    const created = page.waitForResponse((r) => r.request().method() === 'POST' && /\/api\/quotations$/.test(r.url()));
    await form.getByRole('button', { name: 'Create Itinerary' }).click();
    ({ quotation } = await apiJson(await created, 201));
    await expectToast(page, 'Itinerary created successfully.');

    expect(quotation.tripName).toBe(tripName);
    expect(quotation.priceQuote).toBe(price);
    expect(quotation.itineraryDays[0].title).toBe('Arrival in Kochi');
    await expect(page.getByText(tripName).first()).toBeVisible();
  });

  test('marking a lead Won opens conversion pre-filled from the quotation', async ({ page, api }) => {
    lead = await createLead(api, { customerName: unique('QA Buyer'), interest: tripName, travelers: 2 });

    await page.goto(`/leads?search=${encodeURIComponent(lead.customerName)}`);
    await page.locator('tbody tr', { hasText: lead.customerName }).getByTitle('Edit Lead').click();
    const edit = drawer(page, 'Edit Lead');
    await edit.getByLabel('Pipeline Stage').selectOption('Won');
    await edit.getByRole('button', { name: 'Save Changes' }).click();
    await expectToast(page, 'Please complete the booking conversion to mark this lead as Won.');

    const convert = drawer(page, 'Convert Lead to Booking');
    await expect(convert).toBeVisible();
    await expect(convert.getByLabel('Customer Name')).toHaveValue(lead.customerName);
    await expect(convert.locator('select')).toHaveValue(tripName);
    await expect(convert.getByLabel('Price Per Person (₹)')).toHaveValue(String(price));
    await expect(convert.getByLabel('Number of Travelers')).toHaveValue('2');
    await expect(convert.getByText(`Total: ${inr(2 * price).replace('₹', '₹')}`)).toBeVisible();
  });

  test('conversion refuses a past departure date', async ({ page }) => {
    const convert = await reopenConvert(page, lead);
    await convert.getByLabel('Departure Date').fill(daysFromNow(-2));
    await convert.getByRole('button', { name: 'Create Booking' }).click();
    await expectToast(page, 'Departure date must be in the future.');
  });

  test('converts to a booking with the right total and quotation link', async ({ page, api }) => {
    const convert = await reopenConvert(page, lead);
    await convert.getByLabel('Departure Date').fill(daysFromNow(30));
    await convert.getByLabel('Number of Travelers').fill('3');
    await expect(convert.getByText(`Total: ${inr(3 * price)}`)).toBeVisible();

    const converted = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes(`/leads/${lead.leadId}/convert`));
    await convert.getByRole('button', { name: 'Create Booking' }).click();
    const result = await apiJson(await converted, 201);
    await expectToast(page, 'Lead converted to booking!');

    const bookingId = result.booking.bookingId;
    const { booking } = await apiJson(await api.get(`bookings/${bookingId}`), 200);
    expect(booking.trip).toBe(tripName);
    expect(booking.members).toBe(3);
    expect(booking.pricePerPerson).toBe(price);
    expect(booking.totalAmount).toBe(3 * price);
    expect(booking.remaining).toBe(3 * price);
    expect(booking.customerName).toBe(lead.customerName);
    // Same reference the quotation accept flow writes, so the "already
    // booked" checks see this booking too.
    expect(booking.sourceQuotationId).toBe(quotation.quotationId);

    const { lead: after } = await apiJson(await api.get(`leads/${lead.leadId}`), 200);
    expect(after.stage).toBe('Won');
    expect(after.convertedBookingId).toBe(bookingId);

    await page.goto(`/bookings?search=${bookingId}`);
    const row = page.locator('tbody tr', { hasText: lead.customerName });
    await expect(row).toBeVisible();
    await expect(row).toContainText(inr(3 * price));
  });

  test('a lead cannot be converted twice', async ({ api }) => {
    const res = await api.post(`leads/${lead.leadId}/convert`, { data: { departure: daysFromNow(40), members: 1, pricePerPerson: 100 } });
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toContain('already been converted');
  });
});

async function reopenConvert(page, lead) {
  await page.goto(`/leads?search=${encodeURIComponent(lead.customerName)}`);
  await page.locator('tbody tr', { hasText: lead.customerName }).getByTitle('Edit Lead').click();
  const edit = drawer(page, 'Edit Lead');
  await edit.getByLabel('Pipeline Stage').selectOption('Won');
  await edit.getByRole('button', { name: 'Save Changes' }).click();
  const convert = drawer(page, 'Convert Lead to Booking');
  await expect(convert).toBeVisible();
  return convert;
}
