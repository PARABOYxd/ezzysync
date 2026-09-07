const axios = require('axios');
const PDFDocument = require('pdfkit');
const env = require('../config/env');
const pdfAssets = require('./pdfAssets');

async function fetchPlaceholderImage(isLandscape = true) {
  try {
    const width = isLandscape ? 800 : 400;
    const height = isLandscape ? 400 : 400;
    const imgRes = await axios.get(`https://picsum.photos/${width}/${height}?blur=1`, { responseType: 'arraybuffer', timeout: 5000 });
    return Buffer.from(imgRes.data, 'binary');
  } catch (e) {
    return null;
  }
}

async function fetchUnsplashImage(keyword, isLandscape = true) {
  if (!env.unsplashAccessKey) {
    return fetchPlaceholderImage(isLandscape);
  }
  try {
    const orientation = isLandscape ? 'landscape' : 'squarish';
    // Use Unsplash API
    const res = await axios.get(`https://api.unsplash.com/photos/random?query=${encodeURIComponent(keyword)}&orientation=${orientation}&client_id=${env.unsplashAccessKey}`);
    const imgUrl = res.data.urls.regular;
    const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 8000 });
    return Buffer.from(imgRes.data, 'binary');
  } catch (err) {
    return fetchPlaceholderImage(isLandscape);
  }
}

/** Two landscape cover images for the premium template header. Resolves to an
 * empty array on failure so the PDF still renders without them. */
async function fetchCoverImages(tripName, { onError } = {}) {
  try {
    const p1 = fetchUnsplashImage(tripName + ' landscape travel', true);
    const p2 = fetchUnsplashImage(tripName + ' nature travel', true);
    return await Promise.all([p1, p2]);
  } catch (err) {
    if (onError) onError(err);
    return [];
  }
}

/** Parses one "Day N" block of the strict time-based itinerary format into
 * schedule rows, degrading to looser bullet parsing and finally to a single
 * placeholder row when the model ignored the format. */
function parseDayScheduleItems(block) {
  const items = [];
  const itemRegex = /-\s*(\d{2}:\d{2}\s*[AP]M\s*-\s*\d{2}:\d{2}\s*[AP]M):\s*(.+)/gi;
  let match;
  while ((match = itemRegex.exec(block)) !== null) {
    items.push({ time: match[1], activity: match[2] });
  }

  // Fallback parsing if the strict format wasn't followed
  if (items.length === 0) {
    const lines = block.split('\n');
    for (const line of lines) {
      if (line.trim().startsWith('-')) {
        items.push({ time: 'Scheduled Activity', activity: line.replace(/^- /, '').trim() });
      }
    }
  }
  if (items.length === 0) {
    items.push({ time: 'All Day', activity: 'Explore and enjoy the destination at your leisure.' });
  }
  return items;
}

function renderPremiumItinerary(doc, { tripName, itineraryText, coverImages, primaryColor, branding, fonts }) {
  // The agency's name sits above the title, with its logo when it has one, so
  // the document reads as theirs rather than ours.
  let titleTop = 70;
  if (branding.logo) {
    try {
      doc.image(branding.logo, 50, 40, { fit: [110, 40] });
      titleTop = 95;
    } catch (err) {
      // A corrupt or unsupported image must not cost them the itinerary.
    }
  }
  if (branding.companyName) {
    doc.fillColor('#6b7280').font(fonts.bold).fontSize(11)
      .text(pdfAssets.toDrawableText(branding.companyName, fonts.supportsRupee).toUpperCase(), 50, titleTop - 20, { characterSpacing: 1 });
  }

  doc.fillColor(primaryColor).font(fonts.bold).fontSize(45).text('TRAVEL', 50, titleTop);
  doc.text('ITINERARY', 50, titleTop + 45);

  // Top right overlapping images
  if (coverImages[0]) {
    doc.save();
    doc.roundedRect(300, 50, 130, 110, 15).clip();
    doc.image(coverImages[0], 300, 50, { width: 130, height: 110, fit: [130, 110] });
    doc.restore();
  }
  if (coverImages[1]) {
    doc.save();
    doc.roundedRect(400, 120, 130, 110, 15).clip();
    doc.image(coverImages[1], 400, 120, { width: 130, height: 110, fit: [130, 110] });
    doc.restore();
  }

  doc.y = 260;

  // Parse Timeline blocks
  const dayBlocks = itineraryText.split(/(?=Day \d+)/i).filter(b => b.trim().startsWith('Day '));

  dayBlocks.forEach((block, index) => {
    const items = parseDayScheduleItems(block);

    const rowsNeeded = Math.ceil(items.length / 2);
    const blockHeight = 40 + (rowsNeeded * 45);

    if (doc.y + blockHeight > 780) {
      doc.addPage();
      doc.y = 50;
    }

    const currentY = doc.y;

    // Draw Rounded Block
    doc.roundedRect(70, currentY, 470, blockHeight, 15).fill(primaryColor);

    // Draw Circle Badge (D-1)
    doc.circle(70, currentY + 40, 28).fill('white');
    doc.lineWidth(3).strokeColor(primaryColor).circle(70, currentY + 40, 28).stroke();
    doc.font('Helvetica-Bold').fontSize(20).fillColor(primaryColor).text(`D-${index + 1}`, 45, currentY + 33, { align: 'center', width: 50 });

    // Draw Schedule Items in 2 Columns
    let col1X = 110;
    let col2X = 330;
    let startY = currentY + 20;

    items.forEach((item, i) => {
      const isCol1 = i % 2 === 0;
      const rowIdx = Math.floor(i / 2);
      const xPos = isCol1 ? col1X : col2X;
      const yPos = startY + (rowIdx * 45);

      doc.font(fonts.bold).fontSize(11).fillColor('white').text(pdfAssets.toDrawableText(item.time, fonts.supportsRupee), xPos, yPos);
      doc.font(fonts.regular).fontSize(9).fillColor('#e2e8f0').text(pdfAssets.toDrawableText(item.activity, fonts.supportsRupee), xPos, yPos + 15, { width: 200, height: 25, lineBreak: true });
    });

    // Move to next day
    doc.y = currentY + blockHeight + 30;
  });

  doc.moveDown(1);
  // The agency's own footer. This used to read "Powered by EzzySync AI |
  // Premium Experience" - our brand on a document their customer receives from
  // them, which is why no agency wanted to send it as it was.
  doc.font(fonts.regular).fontSize(9).fillColor('#a0aec0')
    .text(contactLine(branding, fonts), 50, doc.y, { align: 'center', width: 495 });
}

function renderStandardItinerary(doc, { tripName, itineraryText, primaryColor, darkColor, secondaryColor, branding, fonts }) {
  const draw = (text) => pdfAssets.toDrawableText(text, fonts.supportsRupee);

  // Header carries the agency's identity. It used to say "EzzySync Travel
  // Itinerary" - our name on a document their own customer opens.
  let headerLeft = 50;
  if (branding.logo) {
    try {
      doc.image(branding.logo, 50, 44, { fit: [70, 40] });
      headerLeft = 132;
    } catch (err) {
      // Unusable image; the text header alone still identifies them.
    }
  }

  doc.fillColor(primaryColor).font(fonts.bold).fontSize(20)
    .text(draw(branding.companyName || 'Travel Itinerary'), headerLeft, 50);
  doc.fillColor(secondaryColor).font(fonts.regular).fontSize(10)
    .text(draw(`Itinerary: ${tripName}`), headerLeft, 76);
  doc.fillColor(secondaryColor).fontSize(9)
    .text(`Prepared on ${new Date().toLocaleDateString('en-IN')}`, headerLeft, 90);

  doc.moveTo(50, 112).lineTo(545, 112).strokeColor('#e5e7eb').lineWidth(1).stroke();
  doc.x = 50;
  doc.y = 132;

  const lines = itineraryText.split('\n');
  for (const line of lines) {
    // Markdown emphasis is stripped because it is markup, not content. What is
    // NOT stripped any more is every non-ASCII character - that rule deleted
    // the rupee sign from every priced itinerary.
    const cleanLine = draw(line.replace(/\*\*/g, '')).trim();

    if (line.startsWith('# ')) {
      doc.moveDown(1);
      doc.font(fonts.bold).fontSize(18).fillColor(primaryColor).text(cleanLine, { lineGap: 6 });
      doc.moveDown(0.5);
    } else if (line.startsWith('## ')) {
      doc.moveDown(1);
      doc.font(fonts.bold).fontSize(14).fillColor(darkColor).text(cleanLine, { lineGap: 5 });
      doc.moveDown(0.4);
    } else if (line.startsWith('### ')) {
      doc.moveDown(0.6);
      doc.font(fonts.bold).fontSize(11).fillColor(darkColor).text(cleanLine, { lineGap: 4 });
      doc.moveDown(0.3);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const bulletContent = cleanLine.replace(/^[-*]\s*/, '');
      doc.font(fonts.regular).fontSize(10).fillColor(secondaryColor).text(draw(`•  ${bulletContent}`), { indent: 12, lineGap: 4 });
    } else if (line.trim() === '') {
      doc.moveDown(0.4);
    } else {
      doc.font(fonts.regular).fontSize(10).fillColor(secondaryColor).text(cleanLine, { lineGap: 4 });
    }
  }

  const footer = contactLine(branding, fonts);
  if (footer) {
    doc.moveDown(1.5);
    doc.font(fonts.regular).fontSize(8).fillColor('#9ca3af')
      .text(footer, 50, doc.y, { align: 'center', width: 495 });
  }
}

/** The agency's contact strip, assembled from whatever they have filled in. */
function contactLine(branding, fonts) {
  const parts = [branding.companyName, branding.phone, branding.address].filter(Boolean);
  return pdfAssets.toDrawableText(parts.join('  |  '), fonts.supportsRupee);
}

/** Renders the itinerary PDF and resolves the finished buffer. Premium tenants
 * get the image-led timeline template, free tenants the plain markdown one. */
/**
 * Turns a tenant's saved settings into what the PDF needs to look like theirs.
 *
 * Only the accent colour has a fallback that is ours; the name and logo are
 * taken as they come, because inventing a company name would be worse than
 * printing none.
 */
async function buildBranding(settings = {}) {
  return {
    companyName: settings.companyName || '',
    phone: settings.whatsappNumber || '',
    address: settings.address || '',
    accentColor: settings.invoiceAccentColor || '',
    logo: await pdfAssets.fetchLogo(settings.companyLogoUrl),
  };
}

async function buildItineraryPdf({ tripName, itineraryText, isPremium, coverImages = [], branding = {} }) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks = [];

  const finished = new Promise((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  // Fonts must be registered before anything is drawn - a font registered
  // halfway through does not apply to text already on the page.
  const fonts = await pdfAssets.applyFonts(doc);

  // The agency's own accent colour when they have set one, so an itinerary
  // looks like the invoices they already send.
  const primaryColor = branding.accentColor || (isPremium ? '#437370' : '#0f766e');
  const darkColor = '#111827';
  const secondaryColor = '#4b5563';

  if (isPremium) {
    renderPremiumItinerary(doc, { tripName, itineraryText, coverImages, primaryColor, branding, fonts });
  } else {
    renderStandardItinerary(doc, { tripName, itineraryText, primaryColor, darkColor, secondaryColor, branding, fonts });
  }

  doc.end();
  return finished;
}

function itineraryFileName(tripName) {
  const safeName = tripName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `Itinerary-${safeName}.pdf`;
}

module.exports = {
  fetchCoverImages,
  buildBranding,
  buildItineraryPdf,
  itineraryFileName,
};
