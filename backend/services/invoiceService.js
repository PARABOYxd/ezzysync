const PDFDocument = require('pdfkit');
const axios = require('axios');
const logger = require('../utils/logger').child({ module: 'invoice' });

/**
 * Generates a professional PDF invoice in-memory and resolves with a Buffer.
 * Supports custom layouts (minimal, classic, modern), dynamic branding color,
 * editable terms, and togglable database fields.
 */
function generateInvoicePDF({ booking, settings, invoiceNumber }) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Pre-fetch the company logo if defined
      let logoBuffer = null;
      if (settings.companyLogoUrl) {
        try {
          const response = await axios.get(settings.companyLogoUrl, {
            responseType: 'arraybuffer',
            timeout: 4000,
          });
          logoBuffer = Buffer.from(response.data);
        } catch (e) {
          logger.warn({ err: e, tenantId: booking?.tenant_id, logoUrl: settings.companyLogoUrl }, 'Could not pre-fetch company logo');
        }
      }

      // Custom dynamic styles
      const primaryColor = settings.invoiceAccentColor || '#0f766e';
      const secondaryColor = '#4b5563'; // gray-600
      const lightGray = '#f3f4f6';      // gray-100
      const borderGray = '#e5e7eb';     // gray-200
      const darkColor = '#111827';      // gray-900

      // Layout specifics
      const layout = settings.invoiceLayout || 'minimal';
      const title = settings.invoiceTitle || 'INVOICE';

      // ---- Layout Styles: Modern Accent Strip ----
      if (layout === 'modern') {
        // Draw a solid left color bar strip
        doc.rect(0, 0, 15, 842).fill(primaryColor);
      }

      // Centered branding header placement
      const contentWidth = 490;
      const logoWidth = 80;
      const logoHeight = 45;
      const centeredLogoX = 55 + (contentWidth - logoWidth) / 2; // ~260

      let nextY = 45;

      if (logoBuffer) {
        try {
          doc.image(logoBuffer, centeredLogoX, nextY, { fit: [logoWidth, logoHeight] });
          nextY += logoHeight + 8;
        } catch (err) {
          logger.warn({ err, tenantId: booking?.tenant_id }, 'Failed to draw logo image onto invoice PDF');
        }
      }

      // ---- Header / Brand Banner ----
      doc
        .fillColor(primaryColor)
        .fontSize(18)
        .text(settings.companyName || 'EzzySync', 55, nextY, { width: contentWidth, align: 'center' });

      nextY += 20;

      doc
        .fillColor(secondaryColor)
        .fontSize(8.5)
        .text(settings.address || '', 55, nextY, { width: contentWidth, align: 'center' });

      if (settings.gstNumber && settings.invoiceShowGst) {
        nextY += 12;
        doc.text(`GSTIN: ${settings.gstNumber}`, 55, nextY, { width: contentWidth, align: 'center' });
      }

      nextY += 20;

      // Header Separator Line
      if (layout === 'classic') {
        doc.moveTo(55, nextY).lineTo(545, nextY).strokeColor(primaryColor).lineWidth(1.5).stroke();
        doc.moveTo(55, nextY + 4).lineTo(545, nextY + 4).strokeColor(borderGray).lineWidth(0.5).stroke();
        nextY += 12;
      } else {
        doc.moveTo(55, nextY).lineTo(545, nextY).strokeColor(borderGray).lineWidth(1).stroke();
        nextY += 12;
      }

      // ---- Customer & Invoice Metadata side-by-side ----
      doc.fillColor(darkColor).fontSize(10).text('BILL TO', 55, nextY);
      doc.fillColor(secondaryColor).fontSize(9)
        .text(booking.customerName, 55, nextY + 14, { width: 220 })
        .text(booking.email, 55, nextY + 26, { width: 220 })
        .text(booking.phone, 55, nextY + 38, { width: 220 });

      doc.fillColor(primaryColor).fontSize(12).text(title.toUpperCase(), 300, nextY, { width: 245, align: 'right' });
      doc.fillColor(secondaryColor).fontSize(8.5)
        .text(`Invoice Number:`, 300, nextY + 16, { width: 90, align: 'left' })
        .text(invoiceNumber, 390, nextY + 16, { width: 155, align: 'right' })
        
        .text(`Date:`, 300, 28, { width: 90, align: 'left' }) // wait, nextY is dynamic, we must specify nextY + offset!
        .text(new Date().toLocaleDateString('en-IN'), 390, nextY + 28, { width: 155, align: 'right' })
        
        .text(`Booking ID:`, 300, nextY + 40, { width: 90, align: 'left' })
        .text(booking.bookingId, 390, nextY + 40, { width: 155, align: 'right' });

      nextY += 58;

      // ---- Trip Details section ----
      doc.moveTo(55, nextY).lineTo(545, nextY).strokeColor(borderGray).lineWidth(0.5).stroke();
      nextY += 10;

      doc.fillColor(darkColor).fontSize(10).text('TRIP DETAILS', 55, nextY);
      doc.fillColor(secondaryColor).fontSize(9)
        .text(`Trip: ${booking.trip}`, 55, nextY + 14, { width: 220 })
        .text(`Departure: ${booking.departure ? booking.departure.slice(0, 10) : ''}`, 55, nextY + 26, { width: 220 })
        .text(booking.pickup ? `Pickup: ${booking.pickup}` : '-', 300, nextY + 14, { width: 245 })
        .text(`Members: ${booking.members} Travelers`, 300, nextY + 26, { width: 245 });

      nextY += 48;

      // ---- Payment Table Layout ----
      // Table Header Background for Modern/Classic layouts
      if (layout === 'modern') {
        doc.rect(55, nextY, 490, 18).fill(lightGray);
      } else if (layout === 'classic') {
        doc.rect(55, nextY, 490, 18).fill(primaryColor);
      } else {
        doc.moveTo(55, nextY).lineTo(545, nextY).strokeColor(borderGray).stroke();
      }

      nextY += 4;
      // Header Text Colors
      const headerTextColor = layout === 'classic' ? '#ffffff' : darkColor;
      doc
        .fillColor(headerTextColor)
        .fontSize(9)
        .text('DESCRIPTION', 60, nextY, { width: 340 })
        .text('AMOUNT (INR)', 400, nextY, { width: 140, align: 'right' });

      nextY += 14;
      if (layout === 'classic') {
        doc.moveTo(55, nextY).lineTo(545, nextY).strokeColor(primaryColor).lineWidth(1.2).stroke();
      } else {
        doc.moveTo(55, nextY).lineTo(545, nextY).strokeColor(borderGray).lineWidth(1).stroke();
      }
      nextY += 8;

      // Table rows
      const items = [
        [`${booking.trip} — ${booking.members} × ₹${booking.pricePerPerson}`, Number(booking.totalAmount).toFixed(2)],
        ['Amount Paid', Number(booking.paid || 0).toFixed(2)],
        ['Remaining Balance', Number(booking.remaining || 0).toFixed(2)],
      ];

      items.forEach(([label, value], i) => {
        const isRemaining = i === 2;
        doc
          .fillColor(isRemaining ? primaryColor : secondaryColor)
          .fontSize(isRemaining ? 10 : 9)
          .text(label, 60, nextY, { width: 340 })
          .text(`Rs. ${value}`, 400, nextY, { width: 140, align: 'right' });
        
        nextY += 20;
        
        // Classic table grid borders
        if (layout === 'classic') {
          doc.moveTo(55, nextY - 5).lineTo(545, nextY - 5).strokeColor(borderGray).stroke();
        }
      });

      if (layout === 'minimal') {
        doc.moveTo(55, nextY).lineTo(545, nextY).strokeColor(borderGray).stroke();
      } else if (layout === 'modern') {
        doc.moveTo(55, nextY).lineTo(545, nextY).strokeColor(primaryColor).lineWidth(2).stroke();
      } else {
        doc.moveTo(55, nextY).lineTo(545, nextY).strokeColor(primaryColor).stroke();
      }

      // ---- Payment Status ----
      if (settings.invoiceShowPaymentStatus) {
        nextY += 12;
        doc
          .fillColor(primaryColor)
          .fontSize(11)
          .text(`Payment Status: ${booking.paymentStatus.toUpperCase()}`, 55, nextY);
      }

      // ---- Terms & Conditions Footer ----
      nextY += 35;
      doc.fillColor(darkColor).fontSize(9.5).text('TERMS & CONDITIONS', 55, nextY);
      doc
        .fillColor(secondaryColor)
        .fontSize(8)
        .text(
          settings.invoiceTerms || 'Amounts once paid are subject to cancellation policies.',
          55,
          nextY + 12,
          { width: 490, lineGap: 1.5 }
        );

      // Centered bottom footer text
      doc
        .fillColor(secondaryColor)
        .fontSize(8.5)
        .text(settings.invoiceFooter || 'Thank you for choosing EzzySync!', 55, 760, {
          width: 490,
          align: 'center',
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateInvoicePDF };
