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
async function sendWhatsAppMessage(booking, settings, mediaLink, customText) {
  const phoneNumberId = settings?.whatsappPhoneNumberId || env.whatsapp.phoneNumberId;
  const accessToken = settings?.whatsappAccessToken || env.whatsapp.accessToken;

  const text = customText || buildMessageText(booking, settings);

  // If using local dummy placeholder credentials, mock the send successfully and print it to the terminal.
  if (
    !phoneNumberId || 
    !accessToken || 
    phoneNumberId === 'your_phone_number_id' || 
    accessToken === 'your_permanent_or_temp_access_token'
  ) {
    // eslint-disable-next-line no-console
    console.log(`\n--- [LOCAL MOCK WHATSAPP MESSAGE SENT] ---`);
    // eslint-disable-next-line no-console
    console.log(`To: ${booking.phone}`);
    // eslint-disable-next-line no-console
    console.log(`Body:\n${text}`);
    if (mediaLink) {
      // eslint-disable-next-line no-console
      console.log(`Attachment: ${mediaLink}`);
    }
    // eslint-disable-next-line no-console
    console.log(`------------------------------------------\n`);

    return {
      messaging_product: 'whatsapp',
      contacts: [{ input: booking.phone, wa_id: booking.phone.replace(/[^\d]/g, '') }],
      messages: [{ id: `wamid.mock_${Math.random().toString(36).substr(2, 9)}` }]
    };
  }

  const url = `https://graph.facebook.com/${env.whatsapp.apiVersion}/${phoneNumberId}/messages`;

  const payload = mediaLink
    ? {
        messaging_product: 'whatsapp',
        to: booking.phone.replace(/[^\d+]/g, ''),
        type: 'document',
        document: { link: mediaLink, filename: `Invoice-${booking.bookingId}.pdf`, caption: text },
      }
    : {
        messaging_product: 'whatsapp',
        to: booking.phone.replace(/[^\d+]/g, ''),
        type: 'text',
        text: { body: text },
      };

  const res = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  return res.data;
}

module.exports = { sendWhatsAppMessage, buildMessageText };
