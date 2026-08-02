const bookingService = require('../services/bookingService');
const settingsService = require('../services/settingsService');
const invoiceService = require('../services/invoiceService');
const emailService = require('../services/emailService');

async function download(req, res, next) {
  try {
    const booking = await bookingService.getBookingById(req.user.tenantId, req.params.bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });

    const settings = await settingsService.getSettings(req.user.tenantId);
    const invoiceNumber = `INV-${booking.bookingId}`;
    const pdfBuffer = await invoiceService.generateInvoicePDF({ booking, settings, invoiceNumber });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

async function sendByEmail(req, res, next) {
  try {
    const booking = await bookingService.getBookingById(req.user.tenantId, req.params.bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (!booking.email) {
      return res.status(400).json({ message: 'This booking has no email address on file.' });
    }

    const settings = await settingsService.getSettings(req.user.tenantId);
    const invoiceNumber = `INV-${booking.bookingId}`;
    const pdfBuffer = await invoiceService.generateInvoicePDF({ booking, settings, invoiceNumber });

    const summaryHtml = `
      <ul>
        <li>Trip: ${booking.trip}</li>
        <li>Departure: ${booking.departure}</li>
        <li>Members: ${booking.members}</li>
        <li>Total Amount: ₹${booking.totalAmount}</li>
        <li>Remaining Amount: ₹${booking.remaining}</li>
      </ul>`;

    try {
      await emailService.sendInvoiceEmail({
        tenantId: req.user.tenantId,
        to: booking.email,
        customerName: booking.customerName,
        tripName: booking.trip,
        pdfBuffer,
        bookingSummaryHtml: summaryHtml,
        invoiceFileName: `${invoiceNumber}.pdf`,
      });
    } catch (emailErr) {
      req.log?.error({ err: emailErr, bookingId: booking.bookingId }, 'Failed to send invoice email');
      return res.status(502).json({ message: 'Could not send the invoice email right now. Please try again in a moment.' });
    }

    res.json({ message: `Invoice emailed to ${booking.email}.` });
  } catch (err) {
    next(err);
  }
}

module.exports = { download, sendByEmail };
