const db = require('../config/db');
const settingsService = require('../services/settingsService');

const VERIFY_TOKEN = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || 'ezzysync_ig_webhook_2024';

/**
 * GET /api/instagram/webhook
 * Meta calls this once to verify the webhook endpoint is legit.
 */
function verifyWebhook(req, res) {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[Instagram Webhook] Verification successful.');
    return res.status(200).send(challenge);
  }
  console.warn('[Instagram Webhook] Verification failed. Token mismatch.');
  return res.status(403).json({ message: 'Verification failed.' });
}

/**
 * POST /api/instagram/webhook
 * Meta pushes all Instagram events here (DMs, reactions, story mentions, etc.)
 */
async function receiveWebhook(req, res) {
  // Always ACK quickly so Meta doesn't retry
  res.status(200).send('EVENT_RECEIVED');

  const body = req.body;
  if (body.object !== 'instagram') return;

  try {
    for (const entry of body.entry || []) {
      const igAccountId = entry.id; // Instagram Account ID

      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;

        const val = change.value;
        const messages = val.messages || [];

        for (const msg of messages) {
          // Only handle text messages for now
          if (msg.type !== 'text') continue;

          const senderId = msg.from;           // Instagram user IGSID
          const text     = msg.text?.body || '';
          const msgId    = msg.id;
          const ts       = msg.timestamp;

          console.log(`[Instagram DM] From: ${senderId} | Account: ${igAccountId} | Msg: "${text}"`);

          // Find which tenant owns this Instagram Account ID
          const tenantResult = await db.query(
            `SELECT tenant_id FROM settings WHERE instagram_account_id = $1 LIMIT 1`,
            [igAccountId]
          );

          if (!tenantResult.rows.length) {
            console.warn(`[Instagram DM] No tenant found for account ${igAccountId}`);
            continue;
          }

          const tenantId = tenantResult.rows[0].tenant_id;

          // Upsert lead from Instagram DM sender
          await upsertInstagramLead(tenantId, senderId, text, msgId, ts);
        }
      }
    }
  } catch (err) {
    console.error('[Instagram Webhook] Error processing event:', err.message);
  }
}

/**
 * Create or update a CRM lead when a new Instagram DM arrives.
 */
async function upsertInstagramLead(tenantId, igSenderId, messageText, msgId, timestamp) {
  try {
    // Check if lead already exists for this Instagram sender
    const existing = await db.query(
      `SELECT id FROM leads WHERE tenant_id = $1 AND instagram_sender_id = $2 LIMIT 1`,
      [tenantId, igSenderId]
    );

    if (existing.rows.length) {
      // Lead exists - just log the message (conversation append can be added later)
      console.log(`[Instagram DM] Existing lead found for sender ${igSenderId}. Message logged.`);
      return;
    }

    // Create new lead from Instagram DM
    await db.query(
      `INSERT INTO leads (tenant_id, name, source, status, notes, instagram_sender_id, created_at, updated_at)
       VALUES ($1, $2, 'Instagram DM', 'New', $3, $4, NOW(), NOW())`,
      [
        tenantId,
        `Instagram User (${igSenderId})`,
        `First message: "${messageText.substring(0, 200)}"`,
        igSenderId,
      ]
    );

    console.log(`[Instagram DM] New lead created for sender ${igSenderId} in tenant ${tenantId}`);
  } catch (err) {
    // If instagram_sender_id column doesn't exist yet, just log - migration needed
    console.warn(`[Instagram DM] Lead upsert skipped (may need migration): ${err.message}`);
  }
}

module.exports = { verifyWebhook, receiveWebhook };
