const leadRepository = require('../repositories/leadRepository');
const whatsappTemplateRepository = require('../repositories/whatsappTemplateRepository');
const broadcastRepository = require('../repositories/broadcastRepository');
const whatsappSendService = require('./whatsappSendService');
const logger = require('../utils/logger').child({ module: 'broadcastService' });

// A single request processes recipients one at a time (see the loop below),
// so this also bounds how long one broadcast call can run for.
const MAX_RECIPIENTS = 200;

/**
 * Sends one message to many leads.
 *
 * Always a template, never free text: most of these leads have not messaged
 * recently, so a Cloud API chat is almost always outside Meta's 24-hour
 * window - a template is the only thing Meta will actually deliver there.
 * For a QR-linked chat there is no window to work around, so the template's
 * own body is sent as plain text instead (see whatsappSendService.sendText),
 * paced by the existing per-tenant rate limiter so a burst of sends still
 * looks like a person, not a script.
 *
 * Processed one recipient at a time and never throws for a single
 * recipient's failure - the caller gets a per-recipient result list back
 * instead, so a template that only works for half the list still reaches
 * the other half.
 */
async function broadcastToLeads(tenantId, { leadIds, templateId, userId, sentBy } = {}) {
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    const err = new Error('Select at least one lead to message.');
    err.status = 400;
    throw err;
  }
  if (leadIds.length > MAX_RECIPIENTS) {
    const err = new Error(`Broadcasts are capped at ${MAX_RECIPIENTS} recipients at a time - select fewer leads.`);
    err.status = 400;
    throw err;
  }
  if (!templateId) {
    const err = new Error('Pick a template to send.');
    err.status = 400;
    throw err;
  }

  const template = await whatsappTemplateRepository.getTemplateById(tenantId, templateId);
  if (!template) {
    const err = new Error('Template not found.');
    err.status = 404;
    throw err;
  }

  const results = [];
  for (const leadId of leadIds) {
    const leadRow = await leadRepository.getLeadById(tenantId, leadId);
    if (!leadRow) {
      results.push({ leadId, sent: false, error: 'Lead not found.' });
      continue;
    }
    if (!leadRow.phone) {
      results.push({ leadId, leadUuid: leadRow.id, customerName: leadRow.customer_name, sent: false, error: 'No phone number on file.' });
      continue;
    }

    try {
      const chat = await whatsappSendService.findOrStartChat(tenantId, {
        phone: leadRow.phone,
        customerName: leadRow.customer_name,
      });

      let sendResult;
      if (chat.transport === 'cloud_api') {
        sendResult = await whatsappSendService.sendTemplate(tenantId, {
          chat,
          template,
          variables: { customer_name: leadRow.customer_name },
          userId,
        });
      } else {
        sendResult = await whatsappSendService.sendText(tenantId, {
          chat,
          userId,
          messageText: template.body,
        });
      }
      results.push({
        leadId, leadUuid: leadRow.id, customerName: leadRow.customer_name, phone: leadRow.phone, sent: true,
        chatId: chat.id, messageId: sendResult?.messageId || null,
      });
    } catch (err) {
      logger.warn({ err, tenantId, leadId }, '[Broadcast] Could not message this lead');
      results.push({ leadId, leadUuid: leadRow.id, customerName: leadRow.customer_name, phone: leadRow.phone, sent: false, error: err.message });
    }
  }

  // Best-effort: a logging failure should never undo sends that already
  // went out, so this can never throw back into the caller.
  try {
    const log = await broadcastRepository.createBroadcastLog(tenantId, {
      templateId,
      templateName: template.name,
      sentBy,
      requestedCount: leadIds.length,
      sentCount: results.filter((r) => r.sent).length,
    });
    await broadcastRepository.insertRecipients(
      tenantId,
      log.id,
      results.map((r) => ({ ...r, leadId: r.leadUuid || null }))
    );
    results.broadcastId = log.id;
  } catch (err) {
    logger.warn({ err, tenantId }, '[Broadcast] Could not persist broadcast history');
  }

  return results;
}

async function listBroadcasts(tenantId) {
  return broadcastRepository.listBroadcasts(tenantId);
}

async function getBroadcastDetail(tenantId, broadcastId) {
  return broadcastRepository.getBroadcastDetail(tenantId, broadcastId);
}

module.exports = { broadcastToLeads, listBroadcasts, getBroadcastDetail, MAX_RECIPIENTS };
