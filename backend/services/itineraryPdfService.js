const axios = require('axios');
const PDFDocument = require('pdfkit');
const env = require('../config/env');

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

function renderPremiumItinerary(doc, { tripName, itineraryText, coverImages, primaryColor }) {
  // Template 1 Header
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(45).text('TRAVEL', 50, 70);
  doc.text('ITINERARY', 50, 115);

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

      doc.font('Helvetica-Bold').fontSize(11).fillColor('white').text(item.time, xPos, yPos);
      doc.font('Helvetica').fontSize(9).fillColor('#e2e8f0').text(item.activity, xPos, yPos + 15, { width: 200, height: 25, lineBreak: true });
    });

    // Move to next day
    doc.y = currentY + blockHeight + 30;
  });

  doc.moveDown(1);
  doc.font('Helvetica-Oblique').fontSize(9).fillColor('#a0aec0').text('Powered by EzzySync AI | Premium Experience', 50, doc.y, { align: 'center', width: 495 });
}

function renderStandardItinerary(doc, { tripName, itineraryText, primaryColor, darkColor, secondaryColor }) {
  // Standard Free Header
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(22).text('EzzySync Travel Itinerary', 50, 50);
  doc.fillColor(secondaryColor).font('Helvetica').fontSize(10).text(`Trip: ${tripName}`, 50, 78);
  doc.fillColor(secondaryColor).fontSize(9).text(`Generated Date: ${new Date().toLocaleDateString('en-IN')}`, 50, 92);
  doc.moveTo(50, 110).lineTo(545, 110).strokeColor('#e5e7eb').lineWidth(1).stroke();
  doc.x = 50;
  doc.y = 130;

  const lines = itineraryText.split('\n');
  for (const line of lines) {
    const cleanLine = line.replace(/\*\*/g, '').replace(/[^\x00-\x7F]/g, '').trim();

    if (line.startsWith('# ')) {
      doc.moveDown(1);
      doc.font('Helvetica-Bold').fontSize(18).fillColor(primaryColor).text(cleanLine, { lineGap: 6 });
      doc.moveDown(0.5);
    } else if (line.startsWith('## ')) {
      doc.moveDown(1);
      doc.font('Helvetica-Bold').fontSize(14).fillColor(darkColor).text(cleanLine, { lineGap: 5 });
      doc.moveDown(0.4);
    } else if (line.startsWith('### ')) {
      doc.moveDown(0.6);
      doc.font('Helvetica-Bold').fontSize(11).fillColor(darkColor).text(cleanLine, { lineGap: 4 });
      doc.moveDown(0.3);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const bulletContent = cleanLine.replace(/^[-*]\s*/, '');
      doc.font('Helvetica').fontSize(10).fillColor(secondaryColor).text(`•  ${bulletContent}`, { indent: 12, lineGap: 4 });
    } else if (line.trim() === '') {
      doc.moveDown(0.4);
    } else {
      doc.font('Helvetica').fontSize(10).fillColor(secondaryColor).text(cleanLine, { lineGap: 4 });
    }
  }
}

/** Renders the itinerary PDF and resolves the finished buffer. Premium tenants
 * get the image-led timeline template, free tenants the plain markdown one. */
function buildItineraryPdf({ tripName, itineraryText, isPremium, coverImages = [] }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const primaryColor = isPremium ? '#437370' : '#0f766e'; // Dark teal from Template 1
      const darkColor = '#111827';
      const secondaryColor = '#4b5563';

      if (isPremium) {
        renderPremiumItinerary(doc, { tripName, itineraryText, coverImages, primaryColor });
      } else {
        renderStandardItinerary(doc, { tripName, itineraryText, primaryColor, darkColor, secondaryColor });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function itineraryFileName(tripName) {
  const safeName = tripName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `Itinerary-${safeName}.pdf`;
}

module.exports = {
  fetchCoverImages,
  buildItineraryPdf,
  itineraryFileName,
};
