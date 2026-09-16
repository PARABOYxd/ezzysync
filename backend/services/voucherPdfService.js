const PDFDocument = require('pdfkit');
const axios = require('axios');
const logger = require('../utils/logger').child({ module: 'voucherPdf' });

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return String(dateStr);
  }
}

const MEAL_PLAN_LABELS = {
  EP: 'EP (European Plan - Room Only)',
  CP: 'CP (Continental Plan - Room + Breakfast)',
  MAP: 'MAP (Modified American Plan - Breakfast + Dinner)',
  AP: 'AP (American Plan - All Meals Included)',
};

/**
 * Generates an official, branded A4 travel voucher PDF (Hotel or Transport).
 * Supports both single & multiple vehicles/drivers as well as multiple hotel stays.
 */
async function generateVoucherPDF({ booking, hotel, hotelsMap = {}, settings = {}, type = 'hotel' }) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40, autoFirstPage: true });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const PAGE_W = 595.28;
      const PAGE_H = 841.89;
      const MARGIN_L = 40;
      const MARGIN_R = PAGE_W - 40; // 555.28
      const CONTENT_W = MARGIN_R - MARGIN_L; // 475.28

      const isHotel = type === 'hotel';
      const companyName = settings.companyName || 'EzzySync Travel Management';
      const accentColor = isHotel ? '#0f766e' : '#1d4ed8'; // teal-700 for hotel, blue-700 for transport
      const darkColor = '#0f172a';
      const textColor = '#334155';
      const mutedColor = '#64748b';
      const borderGray = '#cbd5e1';
      const lightBg = isHotel ? '#f0fdf4' : '#eff6ff';

      const drawPageDecorations = () => {
        doc.rect(20, 20, PAGE_W - 40, PAGE_H - 40).strokeColor(borderGray).lineWidth(1).stroke();
        doc.rect(24, 24, PAGE_W - 48, PAGE_H - 48).strokeColor(accentColor).lineWidth(0.5).stroke();
      };

      const drawFooter = () => {
        const footerY = PAGE_H - 65;
        doc.moveTo(MARGIN_L, footerY).lineTo(MARGIN_R, footerY).strokeColor(borderGray).lineWidth(1).stroke();
        doc.font('Helvetica-Bold').fontSize(8).fillColor(accentColor).text(`${companyName} — Committed to Seamless Travel Experiences`, MARGIN_L, footerY + 6, { width: CONTENT_W, align: 'center' });
        doc.font('Helvetica').fontSize(7).fillColor(mutedColor).text(`For instant assistance or modifications, WhatsApp / Call: ${settings.companyPhone || '+91 91365 20538'} | Generated electronically via EzzySync`, MARGIN_L, footerY + 18, { width: CONTENT_W, align: 'center' });
      };

      // Draw first page border
      drawPageDecorations();

      // Pre-fetch company logo if available
      let logoBuffer = null;
      if (settings.companyLogoUrl) {
        try {
          const res = await axios.get(settings.companyLogoUrl, { responseType: 'arraybuffer', timeout: 3500 });
          logoBuffer = Buffer.from(res.data);
        } catch (e) {
          logger.warn({ err: e.message }, 'Could not pre-fetch company logo for voucher');
        }
      }

      // Top Header Section
      let currentY = 40;
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, MARGIN_L, currentY, { fit: [130, 45] });
        } catch (e) {}
      } else {
        doc.font('Helvetica-Bold').fontSize(17).fillColor(accentColor).text(companyName, MARGIN_L, currentY);
      }

      // Title & Reference
      const transportsList = (Array.isArray(booking.transports) && booking.transports.length > 0)
        ? booking.transports
        : (booking.vehicleType || booking.driverName ? [{
            vehicleType: booking.vehicleType,
            vehicleNumber: booking.vehicleNumber,
            driverName: booking.driverName,
            driverPhone: booking.driverPhone,
            pickupTime: booking.pickupTime,
            pickupLocation: booking.pickupLocation || booking.pickup,
            dropLocation: booking.dropLocation,
            voucherNotes: booking.voucherNotes,
          }] : []);

      const hotelsStayList = (Array.isArray(booking.hotelsStay) && booking.hotelsStay.length > 0)
        ? booking.hotelsStay
        : (booking.hotelId ? [{
            hotelId: booking.hotelId,
            roomCategory: booking.roomCategory,
            mealPlan: booking.mealPlan,
            hotelCheckIn: booking.hotelCheckIn,
            hotelCheckOut: booking.hotelCheckOut,
            hotelBookingStatus: booking.hotelBookingStatus,
            hotelConfirmationNo: booking.hotelConfirmationNo,
          }] : []);

      const voucherTitle = isHotel
        ? (hotelsStayList.length > 1 ? `HOTEL VOUCHER (${hotelsStayList.length} PROPERTIES)` : 'HOTEL RESERVATION VOUCHER')
        : (transportsList.length > 1 ? `TRANSPORT VOUCHER (${transportsList.length} VEHICLES)` : 'TRANSPORT & DRIVER VOUCHER');

      const voucherNo = isHotel
        ? (booking.hotelConfirmationNo ? `CONF: ${booking.hotelConfirmationNo}` : `VOUCHER: H-${booking.bookingId}`)
        : `VOUCHER: T-${booking.bookingId}`;

      doc.font('Helvetica-Bold').fontSize(11).fillColor(accentColor).text(voucherTitle, 280, currentY, { width: 235, align: 'right' });
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#dc2626').text(voucherNo, 280, currentY + 15, { width: 235, align: 'right' });
      doc.font('Helvetica').fontSize(8).fillColor(mutedColor).text(`Issue Date: ${formatDate(new Date())} | Booking: ${booking.bookingId}`, 280, currentY + 28, { width: 235, align: 'right' });

      currentY = 92;
      doc.moveTo(MARGIN_L, currentY).lineTo(MARGIN_R, currentY).strokeColor(borderGray).lineWidth(1).stroke();

      // Agency Contacts Line
      currentY += 6;
      const agencyContactParts = [
        settings.companyPhone ? `Phone: ${settings.companyPhone}` : null,
        settings.companyEmail ? `Email: ${settings.companyEmail}` : null,
        settings.companyAddress ? `Office: ${settings.companyAddress}` : null,
        settings.gstin ? `GSTIN: ${settings.gstin}` : null,
      ].filter(Boolean);

      doc.font('Helvetica').fontSize(7.5).fillColor(mutedColor).text(agencyContactParts.join('  •  ') || 'Authorized Travel Management Partner', MARGIN_L, currentY, { width: CONTENT_W, align: 'center' });

      currentY += 15;
      doc.moveTo(MARGIN_L, currentY).lineTo(MARGIN_R, currentY).strokeColor(borderGray).lineWidth(1).stroke();

      // Section 1: Guest Information
      currentY += 10;
      doc.rect(MARGIN_L, currentY, CONTENT_W, 18).fillColor(accentColor).fill();
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff').text('PRIMARY GUEST & PASSENGER INFORMATION', MARGIN_L + 8, currentY + 4);

      currentY += 22;
      doc.rect(MARGIN_L, currentY, CONTENT_W, 52).strokeColor(borderGray).lineWidth(1).stroke();

      const col1X = MARGIN_L + 10;
      const col2X = MARGIN_L + 175;
      const col3X = MARGIN_L + 340;

      // Guest Row 1
      doc.font('Helvetica-Bold').fontSize(8).fillColor(mutedColor).text('Lead Guest Name:', col1X, currentY + 6);
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(darkColor).text(booking.customerName || 'Guest', col1X, currentY + 17);

      doc.font('Helvetica-Bold').fontSize(8).fillColor(mutedColor).text('Contact Phone:', col2X, currentY + 6);
      doc.font('Helvetica').fontSize(9).fillColor(textColor).text(booking.phone ? `+${booking.phone.replace(/[^0-9]/g, '')}` : '-', col2X, currentY + 17);

      doc.font('Helvetica-Bold').fontSize(8).fillColor(mutedColor).text('Email Address:', col3X, currentY + 6);
      doc.font('Helvetica').fontSize(8.5).fillColor(textColor).text(booking.email || '-', col3X, currentY + 17);

      // Guest Row 2
      doc.font('Helvetica-Bold').fontSize(8).fillColor(mutedColor).text('Tour / Destination:', col1X, currentY + 31);
      doc.font('Helvetica').fontSize(9).fillColor(textColor).text(booking.trip || 'Tour Package', col1X, currentY + 41);

      doc.font('Helvetica-Bold').fontSize(8).fillColor(mutedColor).text('Travelers (PAX):', col2X, currentY + 31);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(textColor).text(`${booking.members || 1} Person(s)`, col2X, currentY + 41);

      doc.font('Helvetica-Bold').fontSize(8).fillColor(mutedColor).text('Emergency Contact:', col3X, currentY + 31);
      doc.font('Helvetica').fontSize(8.5).fillColor(textColor).text(booking.emergencyContact || 'Operations Desk', col3X, currentY + 41);

      currentY += 62;

      const ensureSpace = (needed) => {
        if (currentY + needed > PAGE_H - 85) {
          drawFooter();
          doc.addPage({ size: 'A4', margin: 40 });
          drawPageDecorations();
          currentY = 45;
        }
      };

      // Section 2: Specific Voucher Details
      if (isHotel) {
        ensureSpace(40);
        doc.rect(MARGIN_L, currentY, CONTENT_W, 18).fillColor(accentColor).fill();
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff').text(
          hotelsStayList.length > 1
            ? `CONFIRMED ACCOMMODATION STAYS (${hotelsStayList.length} PROPERTIES)`
            : 'HOTEL STAY & ROOM RESERVATION DETAILS',
          MARGIN_L + 8, currentY + 4
        );
        currentY += 22;

        const renderStays = hotelsStayList.length > 0 ? hotelsStayList : [{}];
        renderStays.forEach((stay, index) => {
          ensureSpace(120);
          const stayHotel = (stay.hotelId && hotelsMap[stay.hotelId]) ? hotelsMap[stay.hotelId] : hotel;
          const hotelName = stayHotel?.name || (hotelsStayList.length > 1 ? `Property #${index + 1}` : 'Hotel accommodation as per confirmed itinerary');
          const hotelAddress = stayHotel?.address || (stayHotel?.city ? `Location: ${stayHotel.city}` : 'Prime Location');

          const cardH = 118;
          doc.rect(MARGIN_L, currentY, CONTENT_W, cardH).strokeColor(borderGray).lineWidth(1).stroke();

          // Hotel Header bar
          doc.rect(MARGIN_L, currentY, CONTENT_W, 20).fillColor('#f8fafc').fill();
          doc.font('Helvetica-Bold').fontSize(9.5).fillColor(darkColor).text(
            hotelsStayList.length > 1 ? `[Stay ${index + 1}/${renderStays.length}] ${hotelName}` : hotelName,
            col1X, currentY + 5, { width: 320 }
          );

          const statusLabel = (stay.hotelBookingStatus || booking.hotelBookingStatus || 'Confirmed').toUpperCase();
          const statusBg = statusLabel === 'CONFIRMED' ? '#dcfce7' : '#fef3c7';
          const statusText = statusLabel === 'CONFIRMED' ? '#15803d' : '#b45309';
          doc.rect(MARGIN_R - 105, currentY + 3, 95, 14).fillColor(statusBg).fill();
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor(statusText).text(`STATUS: ${statusLabel}`, MARGIN_R - 105, currentY + 6, { width: 95, align: 'center' });

          doc.font('Helvetica').fontSize(8).fillColor(mutedColor).text(hotelAddress, col1X, currentY + 24, { width: 330 });
          if (stayHotel?.phone) {
            doc.font('Helvetica').fontSize(8).fillColor(mutedColor).text(`Desk: ${stayHotel.phone}`, col2X + 60, currentY + 24);
          }

          doc.moveTo(col1X, currentY + 36).lineTo(MARGIN_R - 10, currentY + 36).strokeColor(borderGray).lineWidth(0.5).stroke();

          // Dates & Room
          const checkInDate = formatDate(stay.hotelCheckIn || booking.hotelCheckIn || booking.departure);
          const checkOutDate = formatDate(stay.hotelCheckOut || booking.hotelCheckOut);
          const roomCat = stay.roomCategory || booking.roomCategory || 'Standard / Deluxe Room';
          const mealPlanKey = (stay.mealPlan || booking.mealPlan || 'CP').toUpperCase();
          const mealPlanText = MEAL_PLAN_LABELS[mealPlanKey] || `${mealPlanKey} Plan`;
          const confNo = stay.hotelConfirmationNo || booking.hotelConfirmationNo || 'Pending Confirmation';

          doc.font('Helvetica-Bold').fontSize(7.5).fillColor(mutedColor).text('Check-In Date:', col1X, currentY + 42);
          doc.font('Helvetica-Bold').fontSize(9).fillColor(darkColor).text(checkInDate, col1X, currentY + 52);
          doc.font('Helvetica').fontSize(7.5).fillColor(mutedColor).text('Standard 14:00 hrs', col1X, currentY + 64);

          doc.font('Helvetica-Bold').fontSize(7.5).fillColor(mutedColor).text('Check-Out Date:', col2X, currentY + 42);
          doc.font('Helvetica-Bold').fontSize(9).fillColor(darkColor).text(checkOutDate !== '-' ? checkOutDate : 'As per duration', col2X, currentY + 52);
          doc.font('Helvetica').fontSize(7.5).fillColor(mutedColor).text('Standard 11:00 hrs', col2X, currentY + 64);

          doc.font('Helvetica-Bold').fontSize(7.5).fillColor(mutedColor).text('Room Category:', col3X, currentY + 42);
          doc.font('Helvetica-Bold').fontSize(9).fillColor(darkColor).text(roomCat, col3X, currentY + 52);
          doc.font('Helvetica').fontSize(7.5).fillColor(mutedColor).text(`Sharing: ${booking.sharingType || 'Double'}`, col3X, currentY + 64);

          // Confirmation & Meal Plan strip
          doc.rect(col1X, currentY + 80, CONTENT_W - 20, 26).fillColor(lightBg).strokeColor(borderGray).lineWidth(0.5).fillAndStroke();
          doc.font('Helvetica-Bold').fontSize(8).fillColor(accentColor).text('VOUCHER / CONFIRMATION NO:', col1X + 8, currentY + 88);
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor(darkColor).text(confNo, col1X + 155, currentY + 88);

          doc.font('Helvetica-Bold').fontSize(8).fillColor(accentColor).text('MEAL PLAN:', col2X + 70, currentY + 88);
          doc.font('Helvetica-Bold').fontSize(8).fillColor(darkColor).text(mealPlanText, col2X + 130, currentY + 88, { width: 130 });

          currentY += cardH + 10;
        });

      } else {
        // Transport / Multiple Cabs
        ensureSpace(40);
        doc.rect(MARGIN_L, currentY, CONTENT_W, 18).fillColor(accentColor).fill();
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff').text(
          transportsList.length > 1
            ? `CONFIRMED VEHICLES & CHAUFFEURS (${transportsList.length} ASSIGNED)`
            : 'TRANSPORT, VEHICLE & CHAUFFEUR INFORMATION',
          MARGIN_L + 8, currentY + 4
        );
        currentY += 22;

        const renderTransports = transportsList.length > 0 ? transportsList : [{}];
        renderTransports.forEach((transport, index) => {
          ensureSpace(120);
          const vehicleType = transport.vehicleType || booking.vehicleType || 'Private Cab / SUV / Tempo';
          const vehicleNo = transport.vehicleNumber || booking.vehicleNumber || 'Assigned prior to departure';
          const driverName = transport.driverName || booking.driverName || 'Designated Chauffeur';
          const driverPhone = transport.driverPhone || booking.driverPhone || '';
          const pickupTime = transport.pickupTime || booking.pickupTime || 'Scheduled Time';
          const pickupLoc = transport.pickupLocation || booking.pickupLocation || booking.pickup || 'Designated Pickup Location';
          const dropLoc = transport.dropLocation || booking.dropLocation || booking.trip || 'Tour Destination / Hotel';

          const cardH = 115;
          doc.rect(MARGIN_L, currentY, CONTENT_W, cardH).strokeColor(borderGray).lineWidth(1).stroke();

          // Header strip
          doc.rect(MARGIN_L, currentY, CONTENT_W, 20).fillColor('#f8fafc').fill();
          doc.font('Helvetica-Bold').fontSize(9).fillColor(darkColor).text(
            transportsList.length > 1 ? `[Cab ${index + 1}/${renderTransports.length}] ${vehicleType}` : vehicleType,
            col1X, currentY + 5, { width: 310 }
          );

          doc.rect(MARGIN_R - 125, currentY + 3, 115, 14).fillColor('#eff6ff').fill();
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#1e40af').text(`REG: ${vehicleNo}`, MARGIN_R - 125, currentY + 6, { width: 115, align: 'center' });

          doc.moveTo(col1X, currentY + 22).lineTo(MARGIN_R - 10, currentY + 22).strokeColor(borderGray).lineWidth(0.5).stroke();

          // Chauffeur & Contact
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor(mutedColor).text('Chauffeur / Driver Name:', col1X, currentY + 28);
          doc.font('Helvetica-Bold').fontSize(9).fillColor(darkColor).text(driverName, col1X, currentY + 39);

          doc.font('Helvetica-Bold').fontSize(7.5).fillColor(mutedColor).text('Driver Contact Mobile:', col2X, currentY + 28);
          doc.font('Helvetica-Bold').fontSize(9).fillColor(darkColor).text(
            driverPhone ? `+${driverPhone.replace(/[^0-9]/g, '')}` : 'Shared prior to pickup',
            col2X, currentY + 39
          );

          doc.font('Helvetica-Bold').fontSize(7.5).fillColor(mutedColor).text('Tour / Route:', col3X, currentY + 28);
          doc.font('Helvetica').fontSize(8.5).fillColor(textColor).text(booking.trip || 'Tour Itinerary', col3X, currentY + 39);

          doc.moveTo(col1X, currentY + 55).lineTo(MARGIN_R - 10, currentY + 55).strokeColor(borderGray).lineWidth(0.5).stroke();

          // Pickup & Drop
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor(mutedColor).text('Pickup Time:', col1X, currentY + 61);
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor(darkColor).text(`${formatDate(booking.departure)} (${pickupTime})`, col1X, currentY + 72);

          doc.font('Helvetica-Bold').fontSize(7.5).fillColor(mutedColor).text('Pickup Location:', col2X, currentY + 61);
          doc.font('Helvetica').fontSize(8).fillColor(textColor).text(pickupLoc, col2X, currentY + 72, { width: 155 });

          doc.font('Helvetica-Bold').fontSize(7.5).fillColor(mutedColor).text('Drop Location:', col3X, currentY + 61);
          doc.font('Helvetica').fontSize(8).fillColor(textColor).text(dropLoc, col3X, currentY + 72, { width: 155 });

          if (transport.voucherNotes) {
            doc.rect(col1X, currentY + 89, CONTENT_W - 20, 18).fillColor('#f1f5f9').fill();
            doc.font('Helvetica-Bold').fontSize(7.5).fillColor(accentColor).text('Instructions:', col1X + 6, currentY + 94);
            doc.font('Helvetica').fontSize(7.5).fillColor(darkColor).text(transport.voucherNotes, col1X + 65, currentY + 94, { width: CONTENT_W - 95 });
          }

          currentY += cardH + 10;
        });
      }

      // Section 3: Important Policies & Guidelines
      ensureSpace(80);
      doc.rect(MARGIN_L, currentY, CONTENT_W, 16).fillColor('#f8fafc').strokeColor(borderGray).lineWidth(0.5).fillAndStroke();
      doc.font('Helvetica-Bold').fontSize(8).fillColor(darkColor).text('IMPORTANT TERMS, POLICIES & GUIDELINES', MARGIN_L + 8, currentY + 4);

      currentY += 20;
      const terms = isHotel ? [
        'Mandatory Check-In Policy: All adult guests must present an official valid Government Photo ID (Aadhaar Card, Passport, or Driving License) upon check-in. PAN Card is not accepted.',
        'Standard Timings: Standard check-in time is 14:00 hrs and check-out is 11:00 hrs. Early check-in / late check-out is subject to hotel room availability.',
        'Incidental Expenses: Personal expenses such as room service, laundry, and mini-bar consumption are not included and must be settled directly at the hotel desk.',
        'Voucher Presentation: Please present a digital copy or print of this voucher at the reception desk upon arrival.'
      ] : [
        'Vehicle Guidelines: Air conditioning will be switched off on steep hill/ghat climbs to prevent engine overheating as per standard transport regulations.',
        'Package Inclusions: Chauffeur allowance, fuel, toll taxes, and interstate passenger permits are covered as per confirmed package agreement.',
        'Driver Contact: Driver contact details are finalized and active 4-6 hours prior to the scheduled departure time.',
        'Luggage Safety: Travelers are requested to take personal responsibility for their baggage and valuables during transit.'
      ];

      doc.font('Helvetica').fontSize(7.5).fillColor(textColor);
      for (const t of terms) {
        doc.text(`•  ${t}`, MARGIN_L + 8, currentY, { width: CONTENT_W - 16, lineGap: 2 });
        currentY = doc.y + 2;
      }

      // Optional Custom Voucher Notes
      if (booking.voucherNotes) {
        ensureSpace(30);
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(accentColor).text('Agency Special Instructions:', MARGIN_L + 8, currentY + 4);
        doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(textColor).text(booking.voucherNotes, MARGIN_L + 8, currentY + 14, { width: CONTENT_W - 16 });
        currentY = doc.y + 6;
      }

      // Draw final footer
      drawFooter();

      doc.end();
    } catch (err) {
      logger.error({ err }, 'Failed to generate voucher PDF');
      reject(err);
    }
  });
}

module.exports = {
  generateVoucherPDF,
};
