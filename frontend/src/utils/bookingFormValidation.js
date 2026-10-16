import { isValidEmail, isValidPhone } from './validators';

/**
 * Booked+ statuses require the full customer/trip/pricing picture; earlier
 * stages (still "Confirming") don't, since the deal may not be final yet.
 */
export function validateBookingForm(form, { isEdit, previousStatus } = {}) {
  const e = {};
  const status = form.travelStatus;
  const isBookedOrBeyond = ['Booked', 'Completed', 'Refunded'].includes(status);

  // Phone is always required
  if (!isValidPhone(form.phone)) e.phone = 'Contact number is required.';

  // When status is Booked, all key fields become required - except email,
  // which most WhatsApp-first leads never give. It stays validated (a typo
  // shouldn't slip through), just not mandatory: invoice/confirmation sends
  // already fall back to WhatsApp when a booking has no email on file.
  if (isBookedOrBeyond) {
    if (!form.customerName) e.customerName = 'Required when status is Booked+';
    if (form.email && !isValidEmail(form.email)) e.email = 'Enter a valid email address, or leave it blank.';
    if (!form.trip) e.trip = 'Required when status is Booked+';
    if (!form.departure) e.departure = 'Required when status is Booked+';
    if (!form.members || Number(form.members) < 1) e.members = 'At least 1 member required.';
    if (form.pricePerPerson === '' || Number(form.pricePerPerson) < 0) e.pricePerPerson = 'Required when status is Booked+';
  }

  // Validate departure date is today or in the future for new booking deals
  const today = new Date().toISOString().split('T')[0];
  if (!isEdit && form.departure && form.departure.slice(0, 10) < today) {
    e.departure = 'Departure date must be today or a future date.';
  }

  // Completed/Refunded can only be set if previous status was Booked
  if (isEdit && (status === 'Completed' || status === 'Refunded')) {
    if (previousStatus && previousStatus !== 'Booked' && previousStatus !== 'Completed' && previousStatus !== 'Refunded') {
      e.travelStatus = `Cannot mark as ${status} unless the booking was first Booked. Current status: ${previousStatus}`;
    }
  }

  return e;
}
