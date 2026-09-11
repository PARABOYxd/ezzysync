/**
 * The templates a travel agency needs on day one.
 *
 * Outside the 24-hour window Meta accepts nothing but an approved template,
 * and getting one approved means writing it, submitting it, and waiting. An
 * agency that has to do that before it can answer a two-day-old enquiry will
 * conclude the product does not work.
 *
 * Every one of these carries quick-reply buttons, and that is the point rather
 * than decoration: the window re-opens when the customer sends something, and
 * tapping a button counts. Asking for a tap converts far better than asking
 * someone to type, and the whole purpose of a template here is to get the
 * customer to say anything at all.
 *
 * Written to pass review: UTILITY category, tied to a transaction the customer
 * began, no marketing language, one variable each so they stay generic.
 */

const STARTER_TEMPLATES = [
  {
    name: 'quote_ready',
    label: 'Quote is ready',
    category: 'UTILITY',
    body:
      'Hi {{1}}, your travel quote is ready. ' +
      'Shall I send you the day-wise plan and pricing?',
    buttons: ['Yes, send it', 'Call me instead'],
    variables_map: { 1: 'customer_name' },
  },
  {
    name: 'itinerary_sent',
    label: 'Itinerary sent — following up',
    category: 'UTILITY',
    body:
      'Hi {{1}}, I sent across your itinerary earlier. ' +
      'Did you get a chance to look at it?',
    buttons: ['Looks good', 'Need changes'],
    variables_map: { 1: 'customer_name' },
  },
  {
    name: 'payment_reminder',
    label: 'Payment reminder',
    category: 'UTILITY',
    body:
      'Hi {{1}}, a friendly reminder that the balance for your booking is pending. ' +
      'Would you like the payment link again?',
    buttons: ['Send link', 'Call me'],
    variables_map: { 1: 'customer_name' },
  },
  {
    name: 'booking_confirmed',
    label: 'Booking confirmed',
    category: 'UTILITY',
    body:
      'Hi {{1}}, your booking is confirmed. ' +
      'Your vouchers and final itinerary are ready whenever you want them.',
    buttons: ['Send vouchers', 'I have a question'],
    variables_map: { 1: 'customer_name' },
  },
  {
    name: 'departure_reminder',
    label: 'Departure coming up',
    category: 'UTILITY',
    body:
      'Hi {{1}}, your trip departs soon. ' +
      'Would you like me to resend the tickets and pickup details?',
    buttons: ['Yes please', 'All set'],
    variables_map: { 1: 'customer_name' },
  },
  {
    name: 'trip_feedback',
    label: 'Feedback after the trip',
    category: 'UTILITY',
    body:
      'Hi {{1}}, welcome back! We hope the trip went well. ' +
      'Could you share how it went?',
    buttons: ['Share feedback', 'Maybe later'],
    variables_map: { 1: 'customer_name' },
  },
];

/**
 * The components payload Meta expects when submitting one of these.
 *
 * Kept beside the templates so the wording a tenant sees and the wording
 * submitted for approval cannot drift apart.
 */
function toMetaComponents(template) {
  const components = [{ type: 'BODY', text: template.body }];

  if (template.buttons?.length) {
    components.push({
      type: 'BUTTONS',
      buttons: template.buttons.map((text) => ({ type: 'QUICK_REPLY', text })),
    });
  }

  return components;
}

module.exports = { STARTER_TEMPLATES, toMetaComponents };
