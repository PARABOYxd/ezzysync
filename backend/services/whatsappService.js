const axios = require('axios');
const env = require('../config/env');

function buildMessageText(booking, settings) {
  return (
    `Hello ${booking.customerName},\n\n` +
    `Thank you for booking with ${settings.companyName || 'EzzySync'}.\n\n` +
    `Trip: ${booking.trip}\n` +
    `Departure: ${booking.departure}\n` +
    `Pickup: ${booking.pickup || '-'}\n` +
    `Members: ${booking.members}\n` +
    `Total Amount: ₹${booking.totalAmount}\n` +
    `Remaining Amount: ₹${booking.remaining}\n\n` +
    `Your invoice is attached.\n\n` +
    `Thank you.`
  );
}

/**
 * Sends a template/text message via WhatsApp Business Cloud API.
 * NOTE: Meta requires media (PDF invoices) to be uploaded to their servers
 * first to obtain a `media_id`, or referenced via a public HTTPS link.
 * `mediaLink` below expects a publicly reachable URL to the invoice PDF
 * (e.g. one you've stored via a cloud bucket or a signed URL endpoint).
 */
function normalizePhone(phone = '') {
  let clean = phone.replace(/\D/g, '');
  // Remove leading zeros
  clean = clean.replace(/^0+/, '');
  // Prepend country code 91 if it is a 10 digit number
  if (clean.length === 10) {
    clean = '91' + clean;
  }
  return clean;
}

async function sendWhatsAppMessage(booking, settings, mediaLink, customText, mediaType = 'document', filename = null) {
  const phoneNumberId = settings?.whatsappPhoneNumberId || env.whatsapp.phoneNumberId;
  const accessToken = settings?.whatsappAccessToken || env.whatsapp.accessToken;

  if (!phoneNumberId || !accessToken) {
    const err = new Error('WhatsApp API is not configured. Please set your credentials in WhatsApp Settings.');
    err.status = 500;
    throw err;
  }

  const url = `https://graph.facebook.com/${env.whatsapp.apiVersion}/${phoneNumberId}/messages`;
  
  let text = customText || '';
  if (!customText && booking && booking.bookingId !== 'CHAT') {
    text = buildMessageText(booking, settings);
  }

  const normalizedTo = normalizePhone(booking.phone);

  let payload;
  if (mediaLink) {
    if (mediaType === 'image') {
      payload = {
        messaging_product: 'whatsapp',
        to: normalizedTo,
        type: 'image',
        image: { link: mediaLink },
      };
      if (text) {
        payload.image.caption = text;
      }
    } else {
      const nameOfFile = filename || `Document-${Date.now()}.pdf`;
      payload = {
        messaging_product: 'whatsapp',
        to: normalizedTo,
        type: 'document',
        document: { link: mediaLink, filename: nameOfFile },
      };
      if (text) {
        payload.document.caption = text;
      }
    }
  } else {
    payload = {
      messaging_product: 'whatsapp',
      to: normalizedTo,
      type: 'text',
      text: { body: text },
    };
  }

  try {
    const res = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return res.data;
  } catch (err) {
    if (err.response) {
      const errorMsg = err.response.data?.error?.message || err.message;
      // Map 401 to 400 to prevent the frontend interceptor from thinking CRM session expired
      const status = err.response.status === 401 ? 400 : (err.response.status || 502);
      const metaErr = new Error(`Meta WhatsApp API: ${errorMsg}`);
      metaErr.status = status;
      throw metaErr;
    }
    throw err;
  }
}

/**
 * Downloads media from Meta's Graph API, saves it using r2Service (R2 or local fallback),
 * and returns the public download URL.
 */
async function downloadMetaMedia(mediaId, settings) {
  const accessToken = settings?.whatsappAccessToken || env.whatsapp.accessToken;
  const logger = require('../utils/logger');
  if (!accessToken) {
    logger.warn('[whatsappService] Cannot download media: Access Token not configured.');
    return null;
  }

  try {
    // 1. Get direct media URL from Meta Graph API
    const urlRes = await axios.get(`https://graph.facebook.com/${env.whatsapp.apiVersion}/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const downloadUrl = urlRes.data.url;
    const mimeType = urlRes.data.mime_type;

    // 2. Download the file binary payload
    const fileRes = await axios.get(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: 'arraybuffer',
    });
    const buffer = Buffer.from(fileRes.data);

    // 3. Save file using r2Service
    const r2Service = require('./r2Service');
    const isImage = mimeType.startsWith('image/');
    const ext = isImage ? '.webp' : '.pdf'; // Default to webp for images (due to optimization) and pdf for docs
    const filename = `inbound-${mediaId}${ext}`;

    const publicUrl = await r2Service.uploadFile(buffer, filename, mimeType);
    return publicUrl;
  } catch (err) {
    logger.error({ err, mediaId }, '[whatsappService] Failed to download Meta media file');
    return null;
  }
}

module.exports = { sendWhatsAppMessage, buildMessageText, downloadMetaMedia };
