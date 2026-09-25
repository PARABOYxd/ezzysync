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

// Meta occasionally stalls instead of failing. Without a timeout the request
// hangs on an open socket - and on the webhook path that means an inbound
// message sits unprocessed behind it - so every call to Graph is bounded.
// Media downloads get longer, because they are moving a file rather than JSON.
const META_TIMEOUT_MS = 15000;
const META_MEDIA_TIMEOUT_MS = 45000;

/**
 * The Cloud API credentials actually usable right now, or nulls.
 *
 * Both fields fell back to env when the tenant's own value was an empty
 * string, and a .env copied from .env.example carries
 * WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id. That placeholder counted as
 * "configured", so sends were posted to Meta with a nonsense id and came back
 * as "not connected or permissions expired" - on tenants who had never set up
 * the Cloud API at all. A real phone number id is numeric.
 */
function resolveCloudCredentials(settings) {
  const pick = (...values) => values.map((v) => String(v ?? '').trim()).find(Boolean) || null;
  const phoneNumberId = pick(settings?.whatsappPhoneNumberId, env.whatsapp.phoneNumberId);
  const accessToken = pick(settings?.whatsappAccessToken, env.whatsapp.accessToken);
  if (!phoneNumberId || !accessToken || !/^\d+$/.test(phoneNumberId)) {
    return { phoneNumberId: null, accessToken: null };
  }
  return { phoneNumberId, accessToken };
}

async function sendWhatsAppMessage(booking, settings, mediaLink, customText, mediaType = 'document', filename = null, templateName = null, languageCode = 'en', templateComponents = null) {
  const { phoneNumberId, accessToken } = resolveCloudCredentials(settings);

  if (!phoneNumberId || !accessToken) {
    const err = new Error('WhatsApp is not connected. Please connect WhatsApp in WhatsApp Live Chat or Settings to send messages.');
    err.status = 400;
    throw err;
  }

  const url = `https://graph.facebook.com/${env.whatsapp.apiVersion}/${phoneNumberId}/messages`;
  
  let text = customText || '';
  if (!customText && booking && booking.bookingId !== 'CHAT') {
    text = buildMessageText(booking, settings);
  }

  const normalizedTo = normalizePhone(booking.phone);

  // A privately stored file has no public URL; Meta gets a signed one to fetch.
  // Already-public links pass through unchanged.
  mediaLink = require('./r2Service').resolveMediaUrl(mediaLink);

  let payload;
  if (templateName) {
    let cleanName = templateName.trim();
    if (cleanName.startsWith('/')) cleanName = cleanName.slice(1);

    let components = templateComponents;
    if (!components) {
      const companyName = settings?.companyName || 'EzzySync';
      components = [
        {
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: companyName
            }
          ]
        }
      ];
    }

    payload = {
      messaging_product: 'whatsapp',
      to: normalizedTo,
      type: 'template',
      template: {
        name: cleanName,
        language: {
          code: languageCode || 'en'
        },
        components
      }
    };
  } else if (mediaLink) {
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

  const executePost = async (reqPayload) => {
    return axios.post(url, reqPayload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: META_TIMEOUT_MS,
    });
  };

  try {
    const res = await executePost(payload);
    return res.data;
  } catch (err) {
    // Check if error #132001 (Template translation / mismatch error)
    if (err.response && templateName) {
      const errCode = err.response.data?.error?.code;
      const errMsg = err.response.data?.error?.message || '';

      // If translation error code 132001 or missing translation message
      if (errCode === 132001 || errMsg.toLowerCase().includes('translation') || errMsg.toLowerCase().includes('does not exist')) {
        const fallbacks = ['en_US', 'en_IN', 'en'];
        for (const fallbackCode of fallbacks) {
          if (fallbackCode !== (languageCode || 'en')) {
            try {
              payload.template.language.code = fallbackCode;
              const fallbackRes = await executePost(payload);
              return fallbackRes.data;
            } catch (fbErr) {
              // continue fallback loop
            }
          }
        }
      }

      const errorMsg = err.response.data?.error?.message || err.message;
      const status = err.response.status === 401 ? 400 : (err.response.status || 502);
      const metaErr = new Error(`Meta WhatsApp API: ${errorMsg}`);
      metaErr.status = status;
      throw metaErr;
    }

    if (err.response) {
      const errData = err.response.data?.error || {};
      const errorMsg = errData.message || err.message;
      if (
        errData.code === 100 ||
        errData.code === 190 ||
        errData.code === 200 ||
        errorMsg.toLowerCase().includes('unsupported post request') ||
        errorMsg.toLowerCase().includes('does not exist') ||
        errorMsg.toLowerCase().includes('permission') ||
        errorMsg.toLowerCase().includes('access token')
      ) {
        const friendlyErr = new Error('WhatsApp is not connected or permissions expired. Please reconnect WhatsApp in WhatsApp Live Chat or Settings.');
        friendlyErr.status = 400;
        throw friendlyErr;
      }

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
      timeout: META_TIMEOUT_MS,
    });
    const downloadUrl = urlRes.data.url;
    const mimeType = urlRes.data.mime_type;

    // 2. Download the file binary payload
    const fileRes = await axios.get(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: 'arraybuffer',
      timeout: META_MEDIA_TIMEOUT_MS,
      // A customer can attach a very large file; cap what we will pull into
      // memory rather than letting one message exhaust the process.
      maxContentLength: 30 * 1024 * 1024,
    });
    const buffer = Buffer.from(fileRes.data);

    // 3. Save file using r2Service
    const r2Service = require('./r2Service');
    const isImage = mimeType.startsWith('image/');
    const ext = isImage ? '.webp' : '.pdf'; // Default to webp for images (due to optimization) and pdf for docs
    const filename = `inbound-${mediaId}${ext}`;

    // Stored privately: this is whatever the customer sent, passports included.
    return await r2Service.uploadPrivateFile(buffer, filename, mimeType, 'whatsapp/inbound/cloud_api');
  } catch (err) {
    logger.error({ err, mediaId }, '[whatsappService] Failed to download Meta media file');
    return null;
  }
}

/**
 * Whether the stored Cloud API credentials actually work right now.
 *
 * Settings only knew whether a token had ever been pasted in, so the page
 * said "Connected" for an expired token and the first hint of trouble was a
 * failed send. This asks Meta.
 */
async function checkCloudApiHealth(settings) {
  const { phoneNumberId, accessToken } = resolveCloudCredentials(settings);
  if (!phoneNumberId || !accessToken) {
    return { configured: false, healthy: false, error: null };
  }

  try {
    const { data } = await axios.get(
      `https://graph.facebook.com/${env.whatsapp.apiVersion}/${phoneNumberId}`,
      {
        params: { fields: 'display_phone_number,verified_name,quality_rating' },
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 8000,
      }
    );
    return {
      configured: true,
      healthy: true,
      error: null,
      displayPhoneNumber: data?.display_phone_number || null,
      verifiedName: data?.verified_name || null,
      qualityRating: data?.quality_rating || null,
    };
  } catch (err) {
    const meta = err.response?.data?.error;
    const expired = meta?.code === 190 || meta?.code === 200 || meta?.code === 100;
    return {
      configured: true,
      healthy: false,
      error: expired
        ? 'Meta rejected these credentials - the access token has expired or lost its permissions. Reconnect to get a fresh token.'
        : (meta?.message || err.message || 'Could not reach Meta.'),
    };
  }
}

module.exports = { sendWhatsAppMessage, buildMessageText, downloadMetaMedia, checkCloudApiHealth };
