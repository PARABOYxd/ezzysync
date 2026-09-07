const axios = require('axios');
const logger = require('../utils/logger').child({ module: 'pdf_assets' });

/**
 * Shared bits every generated PDF needs: a font that can draw a rupee sign, and
 * the tenant's logo.
 *
 * PDFKit's built-in Helvetica is WinAnsi-encoded and has no glyph for U+20B9,
 * so "₹" cannot be drawn with it at all. The invoice already worked around
 * this by fetching Roboto; the itinerary instead deleted every non-ASCII
 * character before drawing, which quietly turned "₹50,000" into "50,000" - the
 * same number, with no currency on it, on a document quoting a price to a
 * customer.
 */

let regularFontBuffer = null;
let boldFontBuffer = null;
let fontLoadingPromise = null;

const ROBOTO_REGULAR =
  'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf';
const ROBOTO_BOLD =
  'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf';

async function fetchFonts() {
  try {
    const [regular, bold] = await Promise.all([
      axios.get(ROBOTO_REGULAR, { responseType: 'arraybuffer', timeout: 5000 }),
      axios.get(ROBOTO_BOLD, { responseType: 'arraybuffer', timeout: 5000 }),
    ]);
    regularFontBuffer = Buffer.from(regular.data);
    boldFontBuffer = Buffer.from(bold.data);
  } catch (err) {
    logger.warn({ err: err.message }, 'Could not fetch Roboto; PDFs will use Helvetica and "Rs."');
  }
}

/**
 * Registers Unicode fonts on a document and reports what it can draw.
 *
 * Fetched once per process and cached. On failure the PDF still renders - the
 * caller falls back to Helvetica and, because `supportsRupee` is false, writes
 * "Rs." instead of a symbol that would come out as a blank box.
 */
async function applyFonts(doc) {
  if (!regularFontBuffer || !boldFontBuffer) {
    if (!fontLoadingPromise) fontLoadingPromise = fetchFonts();
    await fontLoadingPromise;
  }

  if (regularFontBuffer && boldFontBuffer) {
    doc.registerFont('Roboto-Regular', regularFontBuffer);
    doc.registerFont('Roboto-Bold', boldFontBuffer);
    return { regular: 'Roboto-Regular', bold: 'Roboto-Bold', supportsRupee: true };
  }

  return { regular: 'Helvetica', bold: 'Helvetica-Bold', supportsRupee: false };
}

/**
 * The tenant's logo, or null.
 *
 * Never throws: a broken logo URL must not stop an itinerary going out. The
 * size cap is there because this buffer is embedded in the PDF, and an agency
 * pointing at a 20 MB image would make a document nobody can send on WhatsApp.
 */
async function fetchLogo(url) {
  if (!url) return null;
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 6000,
      maxContentLength: 5 * 1024 * 1024,
    });
    return Buffer.from(response.data);
  } catch (err) {
    logger.warn({ url, err: err.message }, 'Could not fetch the tenant logo for a PDF');
    return null;
  }
}

/**
 * Makes text safe for whichever font ended up being used.
 *
 * With Roboto everything passes through untouched. With Helvetica the
 * characters that have no WinAnsi glyph are *translated* rather than deleted -
 * "₹" becomes "Rs.", smart quotes become straight ones - so the meaning
 * survives even when the glyph cannot.
 */
function toDrawableText(text, supportsRupee) {
  if (typeof text !== 'string') return '';
  if (supportsRupee) return text;

  return text
    .replace(/₹/g, 'Rs.')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/•/g, '*')
    .replace(/€/g, 'EUR')
    // Anything still outside Latin-1 has no glyph and would render as a box.
    .replace(/[^\x00-\xFF]/g, '');
}

module.exports = {
  applyFonts,
  fetchLogo,
  toDrawableText,
};
