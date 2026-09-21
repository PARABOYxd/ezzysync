// What bookings.source_quotation_id stores - the human quotationId ("QT-..."),
// the same value the quotation accept/convert path writes, so both ways of
// creating a booking are recognised by the "already booked" checks.
export const quotationRef = (q) => (q ? q.quotationId || q.quotation_id || q.id || '' : '');
