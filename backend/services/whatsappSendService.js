const whatsappWebService = require('./whatsappWebService');
const whatsappService = require('./whatsappService');
const whatsappWebRepository = require('../repositories/whatsappWebRepository');
const settingsService = require('./settingsService');
const whatsappWindow = require('./whatsappWindowService');
const logger = require('../utils/logger').child({ module: 'whatsapp_send' });

/**
 * Sends on whichever WhatsApp connection the chat actually belongs to.
 *
 * One inbox shows chats from two transports, and they are not interchangeable.
 * Everything used to go to the QR-linked socket, so a Cloud API chat could not
 * be replied to at all: there is no socket for that tenant, and the send failed
 * with "WhatsApp is not connected. Please scan the QR code" - advice that makes
 * no sense for a number connected through Meta.
 *
 * The agent should not have to know any of this. They type, and the message
 * leaves by the right road.
 */

async function sendText(tenantId, { chat, messageText, mediaBuffer, fileName, mimeType, userId }) {
  if (chat.transport === 'cloud_api') {
    // Meta refuses free-form outside the 24-hour window; checked here as well
    // as in the controller because this is the last point before the network.
    whatsappWindow.assertCanSendFreeform(chat);

    const settings = await settingsService.getSettingsWithSecrets(tenantId);
    const result = await whatsappService.sendWhatsAppMessage(
      { phone: chat.phone, bookingId: 'CHAT' },
      settings,
      null,
      messageText
    );

    const messageId = result?.messages?.[0]?.id || null;
    await whatsappWebRepository.insertMessage(tenantId, {
      chatId: chat.id,
      messageId,
      direction: 'outbound',
      sender: 'agent',
      messageText,
      status: 'sent',
      userId,
    });
    await whatsappWebRepository.recordHumanReplyOnChat(chat.id, messageText);

    return { sent: true, via: 'cloud_api', messageId };
  }

  return whatsappWebService.sendManualMessage(tenantId, {
    chatId: chat.id,
    phone: chat.phone,
    jid: chat.jid,
    messageText,
    mediaBuffer,
    fileName,
    mimeType,
    userId,
  });
}

/**
 * Sends an approved template - the only thing Meta accepts once the window has
 * closed, and the way a conversation gets re-opened.
 *
 * Templates exist only on the Cloud API. A QR-linked number has no such
 * concept, and nothing outside the window to work around, so asking for one
 * there is a mistake worth naming rather than silently sending plain text.
 */
async function sendTemplate(tenantId, { chat, template, variables = {}, userId }) {
  if (chat.transport !== 'cloud_api') {
    const err = new Error(
      'Ready-made messages are only needed on WhatsApp Business API chats. ' +
        'You can reply to this customer normally.'
    );
    err.status = 400;
    throw err;
  }

  const settings = await settingsService.getSettingsWithSecrets(tenantId);

  // Meta substitutes {{1}}, {{2}} ... positionally, so the components are
  // built in the template's own variable order rather than object order.
  const positions = Object.keys(template.variables_map || {}).sort((a, b) => Number(a) - Number(b));
  const parameters = positions.map((position) => ({
    type: 'text',
    text: String(variables[template.variables_map[position]] ?? chat.customer_name ?? 'there'),
  }));

  const components = parameters.length ? [{ type: 'body', parameters }] : null;

  const result = await whatsappService.sendWhatsAppMessage(
    { phone: chat.phone, bookingId: 'CHAT' },
    settings,
    null,
    null,
    'document',
    null,
    template.name,
    template.language_code || 'en',
    components
  );

  const messageId = result?.messages?.[0]?.id || null;

  // Stored with the rendered text rather than the raw {{1}} so the thread
  // reads like what the customer received.
  const rendered = positions.reduce(
    (text, position, index) => text.replace(`{{${position}}}`, parameters[index]?.text ?? ''),
    template.body
  );

  await whatsappWebRepository.insertMessage(tenantId, {
    chatId: chat.id,
    messageId,
    direction: 'outbound',
    sender: 'agent',
    messageText: rendered,
    status: 'sent',
    userId,
  });
  await whatsappWebRepository.recordHumanReplyOnChat(chat.id, rendered);

  logger.info({ tenantId, chatId: chat.id, template: template.name }, 'Template sent to re-open a closed window');

  // Deliberately not treated as re-opening the window: only a message from the
  // customer does that, and pretending otherwise would let the next free-form
  // send through to a refusal from Meta.
  return { sent: true, via: 'cloud_api', messageId, windowReopened: false };
}

module.exports = { sendText, sendTemplate };
