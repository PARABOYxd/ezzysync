const PDFDocument = require('pdfkit');
const axios = require('axios');
const logger = require('../utils/logger').child({ module: 'invoice' });

// In-memory cache for fonts to support Rupee symbol (₹) rendering
let regularFontBuffer = null;
let boldFontBuffer = null;
let fontLoadingPromise = null;

async function prefetchFonts() {
  if (regularFontBuffer && boldFontBuffer) return;
  try {
    const [regRes, boldRes] = await Promise.all([
      axios.get('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf', {
        responseType: 'arraybuffer',
        timeout: 5000,
      }),
      axios.get('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf', {
        responseType: 'arraybuffer',
        timeout: 5000,
      })
    ]);
    regularFontBuffer = Buffer.from(regRes.data);
    boldFontBuffer = Buffer.from(boldRes.data);
  } catch (err) {
    logger.warn({ err: err.message }, 'Could not pre-fetch Roboto fonts for Rupee symbol. Falling back to standard fonts.');
  }
}

/**
 * Formats date strings to the professional "05 August 2026" standard format.
 */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch (err) {
    return dateStr;
  }
}

/**
 * Generates a clean, logo-led PDF invoice in-memory and resolves with a Buffer.
 * Redesigned for perfect spacing, dynamic field rendering, and rupee symbol support.
 */
function generateInvoicePDF({ booking, settings, invoiceNumber }) {
  return new Promise(async (resolve, reject) => {
    try {
      // Ensure fonts are loaded before starting PDF generation
      if (!regularFontBuffer || !boldFontBuffer) {
        if (!fontLoadingPromise) {
          fontLoadingPromise = prefetchFonts();
        }
        await fontLoadingPromise;
      }

      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const PAGE_W = 595.28;
      const PAGE_H = 841.89;
      const MARGIN_L = 55;
      const MARGIN_R = 540;
      const CONTENT_W = MARGIN_R - MARGIN_L; // 485

      // Register fonts if loaded
      const fontRegular = regularFontBuffer ? 'Roboto-Regular' : 'Helvetica';
      const fontBold = boldFontBuffer ? 'Roboto-Bold' : 'Helvetica-Bold';
      
      if (regularFontBuffer) {
        doc.registerFont('Roboto-Regular', regularFontBuffer);
      }
      if (boldFontBuffer) {
        doc.registerFont('Roboto-Bold', boldFontBuffer);
      }

      // Set default font
      doc.font(fontRegular);

      // ---- Pre-fetch logo ----
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

      // ---- Palette & Colors ----
      const darkColor = '#0f172a';      // slate-900
      const textColor = '#334155';      // slate-700
      const mutedColor = '#64748b';     // slate-500
      const borderGray = '#e2e8f0';     // slate-200
      const accentColor = settings.invoiceAccentColor || '#0f766e'; // teal-700 fallback

      const companyName = settings.companyName || 'Company';
      
      // Use Rupee symbol only if Roboto font loaded successfully, otherwise fall back to Rs.
      const currencySymbol = regularFontBuffer ? (settings.currencySymbol || '₹') : 'Rs.';

      const fmt = (n) => `${currencySymbol} ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

      // ====================================================================
      // 1. WATERMARK (Faint logo + uppercase brand name background)
      // ====================================================================
      const wmCenterY = PAGE_H / 2 - 40;
      if (logoBuffer) {
        doc.save();
        doc.opacity(0.04);
        const wmSize = 180;
        try {
          doc.image(logoBuffer, PAGE_W / 2 - wmSize / 2, wmCenterY - wmSize / 2, { fit: [wmSize, wmSize], align: 'center' });
        } catch (err) {
          logger.warn({ err, tenantId: booking?.tenant_id }, 'Failed to draw watermark logo');
        }
        doc.restore();
      }

      doc.save();
      doc.opacity(0.035);
      doc
        .font(fontBold)
        .fontSize(32)
        .fillColor(darkColor)
        .text(companyName.toUpperCase(), 0, wmCenterY + 100, { width: PAGE_W, align: 'center' });
      if (settings.companyWebsite) {
        doc
          .font(fontRegular)
          .fontSize(8)
          .text(settings.companyWebsite.toUpperCase(), 0, wmCenterY + 140, {
            width: PAGE_W,
            align: 'center',
            characterSpacing: 2,
          });
      }
      doc.restore();

      // ====================================================================
      // 2. HEADER SECTION (Big INVOICE title, info left, logo right)
      // ====================================================================
      let y = 50;

      // Title & Metadata (Left)
      doc.font(fontBold).fontSize(26).fillColor(accentColor).text((settings.invoiceTitle || 'INVOICE').toUpperCase(), MARGIN_L, y);
      
      doc.font(fontBold).fontSize(10).fillColor(darkColor).text('INVOICE NO: ', MARGIN_L, y + 32);
      doc.font(fontRegular).fillColor(textColor).text(invoiceNumber, MARGIN_L + 80, y + 32);

      if (settings.gstNumber && settings.invoiceShowGst) {
        doc.font(fontBold).fontSize(9).fillColor(darkColor).text('GSTIN: ', MARGIN_L, y + 46);
        doc.font(fontRegular).fillColor(textColor).text(settings.gstNumber, MARGIN_L + 45, y + 46);
      }

      // Logo or Corporate Name (Right)
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, MARGIN_R - 90, y, { fit: [90, 60], align: 'right' });
        } catch (err) {
          logger.warn({ err, tenantId: booking?.tenant_id }, 'Failed to draw header logo');
        }
      } else {
        doc.font(fontBold).fontSize(14).fillColor(darkColor).text(companyName, MARGIN_L, y, { width: CONTENT_W, align: 'right' });
      }

      y += 80;

      // Divider Line
      doc.moveTo(MARGIN_L, y).lineTo(MARGIN_R, y).strokeColor(borderGray).lineWidth(1.5).stroke();
      y += 20;

      // ====================================================================
      // 3. ISSUED TO & DATE METADATA (Grid Alignments to Prevent Overlap & Uneven Gaps)
      // ====================================================================
      const infoY = y;
      
      // Issued To Customer info (Left Column - Spaced Uniformly)
      doc.font(fontBold).fontSize(9.5).fillColor(accentColor).text('ISSUED TO:', MARGIN_L, infoY);
      doc.font(fontBold).fontSize(10).fillColor(darkColor).text(booking.customerName || '-', MARGIN_L, infoY + 16, { width: 240 });
      doc.font(fontRegular).fontSize(9).fillColor(textColor).text(booking.phone || '-', MARGIN_L, infoY + 30, { width: 240 });
      doc.font(fontRegular).fontSize(9).fillColor(textColor).text(booking.email || '-', MARGIN_L, infoY + 44, { width: 240 });

      // Invoice Date & Booking details (Right Column - Spaced Uniformly)
      const rightColX = 320;
      const rightColW = MARGIN_R - rightColX;

      doc.font(fontBold).fontSize(9.5).fillColor(accentColor).text('INVOICE DETAILS:', rightColX, infoY, { width: rightColW, align: 'right' });
      
      const invoiceDateText = settings.invoiceDate || formatDate(new Date());
      
      doc.font(fontBold).fontSize(9).fillColor(darkColor).text('Date:', rightColX, infoY + 16);
      doc.font(fontRegular).fontSize(9).fillColor(textColor).text(invoiceDateText, rightColX, infoY + 16, { width: rightColW, align: 'right' });

      doc.font(fontBold).fontSize(9).fillColor(darkColor).text('Booking ID:', rightColX, infoY + 30);
      doc.font(fontRegular).fontSize(9).fillColor(textColor).text(booking.bookingId || '-', rightColX, infoY + 30, { width: rightColW, align: 'right' });

      y += 75;

      // ====================================================================
      // 4. ITEMS TABLE
      // ====================================================================
      const colTrip = MARGIN_L;
      const colTripW = 230;
      const colQty = 340;
      const colQtyW = 45;
      const colUnit = 400;
      const colUnitW = 75;
      const colTotal = 475;
      const colTotalW = 65;

      // Header labels
      doc.font(fontBold).fontSize(9).fillColor(accentColor)
        .text('TRIP DESCRIPTION', colTrip, y, { width: colTripW })
        .text('QTY', colQty, y, { width: colQtyW, align: 'center' })
        .text('RATE', colUnit, y, { width: colUnitW, align: 'left' })
        .text('TOTAL', colTotal, y, { width: colTotalW, align: 'right' });

      y += 15;
      doc.moveTo(MARGIN_L, y).lineTo(MARGIN_R, y).strokeColor(accentColor).lineWidth(1.2).stroke();
      y += 10;

      // Items resolution
      const items = Array.isArray(booking.items) && booking.items.length
        ? booking.items
        : [{
          name: booking.trip,
          qty: booking.members,
          unit: booking.pricePerPerson,
          total: booking.totalAmount,
        }];

      items.forEach((item) => {
        const rowTotal = item.total != null ? item.total : Number(item.qty || 0) * Number(item.unit || 0);
        doc
          .font(fontRegular)
          .fontSize(9)
          .fillColor(textColor)
          .text(item.name || '', colTrip, y, { width: colTripW })
          .text(String(item.qty ?? ''), colQty, y, { width: colQtyW, align: 'center' })
          .text(fmt(item.unit), colUnit, y, { width: colUnitW, align: 'left' })
          .text(fmt(rowTotal), colTotal, y, { width: colTotalW, align: 'right' });
        y += 20;
      });

      y += 5;
      doc.moveTo(MARGIN_L, y).lineTo(MARGIN_R, y).strokeColor(borderGray).lineWidth(1).stroke();
      y += 12;

      // ====================================================================
      // 5. BILLING SUMMARY (Right-aligned table)
      // ====================================================================
      const sumLabelX = 350;
      const sumLabelW = 110;
      const sumValueX = 460;
      const sumValueW = 80;

      const subtotal = booking.totalAmount ?? items.reduce((s, it) => s + (it.total != null ? Number(it.total) : Number(it.qty || 0) * Number(it.unit || 0)), 0);
      const paid = booking.paid || 0;
      const due = booking.remaining != null ? booking.remaining : subtotal - paid;

      // Subtotal Row
      doc.font(fontRegular).fontSize(9.5).fillColor(textColor)
        .text('Subtotal', sumLabelX, y, { width: sumLabelW, align: 'right' })
        .text(fmt(subtotal), sumValueX, y, { width: sumValueW, align: 'right' });
      y += 16;

      // Paid Row
      doc.font(fontRegular).fontSize(9.5).fillColor(textColor)
        .text('Amount Paid', sumLabelX, y, { width: sumLabelW, align: 'right' })
        .text(fmt(paid), sumValueX, y, { width: sumValueW, align: 'right' });
      y += 16;
      doc.moveTo(sumLabelX + 30, y).lineTo(MARGIN_R, y).strokeColor(borderGray).lineWidth(0.5).stroke();
      y += 8;

      // Due Row
      const dueLabel = settings.invoiceDueLabel || 'Due Amount';
      doc.font(fontBold).fontSize(10).fillColor(accentColor)
        .text(dueLabel, sumLabelX, y, { width: sumLabelW, align: 'right' })
        .text(fmt(due), sumValueX, y, { width: sumValueW, align: 'right' });
      
      y += 18;

      // Payment Status Label
      if (settings.invoiceShowPaymentStatus && booking.paymentStatus) {
        doc.font(fontBold).fontSize(8).fillColor(mutedColor)
          .text(`STATUS: ${String(booking.paymentStatus).toUpperCase()}`, sumLabelX, y, { width: sumLabelW + sumValueW, align: 'right' });
        y += 18;
      }

      y += 12;

      // ====================================================================
      // 6. DESCRIPTION SECTION
      // ====================================================================
      if (booking.pickup || booking.departure || booking.pickupDate) {
        doc.font(fontBold).fontSize(9.5).fillColor(accentColor).text('DESCRIPTION', MARGIN_L, y);
        y += 14;
        doc.font(fontRegular).fontSize(8.5).fillColor(textColor);
        if (booking.pickup) {
          doc.text('Pickup/Drop Point : ', MARGIN_L, y, { continued: true });
          doc.font(fontBold).fillColor(darkColor).text(booking.pickup);
          y += 14;
        }
        const pickupDate = booking.pickupDate || booking.departure;
        if (pickupDate) {
          doc.font(fontRegular).fillColor(textColor).text('Departure/Pickup Date : ', MARGIN_L, y, { continued: true });
          doc.font(fontBold).fillColor(darkColor).text(formatDate(pickupDate));
          y += 14;
        }
        y += 10;
      }

      // ====================================================================
      // 7. NOTE & CONDITIONS (Bullet lists with safe unicode bullets)
      // ====================================================================
      const noteLines = Array.isArray(settings.invoiceTerms)
        ? settings.invoiceTerms
        : (typeof settings.invoiceTerms === 'string' && settings.invoiceTerms.trim())
          ? settings.invoiceTerms.split('\n').map((s) => s.trim()).filter(Boolean)
          : ['Amounts once paid are subject to cancellation & refund policy shared at the time of booking. Please carry a valid photo ID on the day of departure. For any queries, contact us.'];

      if (noteLines.length) {
        doc.font(fontBold).fontSize(9.5).fillColor(accentColor).text('TERMS & CONDITIONS', MARGIN_L, y);
        y += 14;
        doc.font(fontRegular).fontSize(8).fillColor(textColor);
        noteLines.forEach((line) => {
          const bulletY = y;
          doc.text('•', MARGIN_L, bulletY, { continued: false, width: 10 });
          doc.text(line, MARGIN_L + 12, bulletY, { width: CONTENT_W - 12, lineGap: 1.5 });
          y = doc.y + 4;
        });
        y += 10;
      }

      // ====================================================================
      // 8. PAYMENT TO DETAILS
      // ====================================================================
      const payTo = settings.paymentTo || {};
      const payName = payTo.name || settings.paymentToName;
      const payPhone = payTo.phone || settings.paymentToPhone;
      const payEmail = payTo.email || settings.paymentToEmail;

      if (payName || payPhone || payEmail) {
        doc.font(fontBold).fontSize(9.5).fillColor(accentColor).text('PAYMENT DIRECTIONS:', MARGIN_L, y);
        y += 14;
        doc.font(fontRegular).fontSize(8.5).fillColor(textColor);
        if (payName) { 
          doc.text('Account Name : ', MARGIN_L, y, { continued: true }).font(fontBold).fillColor(darkColor).text(payName);
          y += 13; 
        }
        if (payPhone) { 
          doc.text('Contact / UPI : ', MARGIN_L, y, { continued: true }).font(fontBold).fillColor(darkColor).text(payPhone);
          y += 13; 
        }
        if (payEmail) {
          doc.font(fontRegular).fillColor(textColor).text('Payment Email : ', MARGIN_L, y, { continued: true }).font(fontBold).fillColor(darkColor).text(payEmail);
          y += 13;
        }
      }

      // Footer message
      doc
        .font(fontBold)
        .fontSize(10)
        .fillColor(accentColor)
        .text((settings.invoiceFooter || 'THANK YOU FOR BOOKING WITH US!').toUpperCase(), MARGIN_L, 760, { width: CONTENT_W, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateInvoicePDF };
