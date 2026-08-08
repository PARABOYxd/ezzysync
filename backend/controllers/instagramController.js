const axios = require('axios');
const db = require('../config/db');
const env = require('../config/env');

const VERIFY_TOKEN = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || 'ezzysync_ig_webhook_2024';
const FB_APP_ID = process.env.FACEBOOK_APP_ID || '';
const FB_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '';
const BACKEND_URL = process.env.NODE_ENV === 'development' 
  ? `http://localhost:${process.env.PORT || 5001}` 
  : (process.env.BACKEND_URL || 'https://ezzysync-production.up.railway.app');
const FRONTEND_URL = env.frontendUrl || 'http://localhost:5173';

// ─── OAuth: Step 1 ─────────────────────────────────────────────────────────
// Frontend opens this in a popup. We redirect to Facebook login.
async function startOAuth(req, res) {
  try {
    const token = req.query.token; // JWT passed from frontend popup
    if (!token) return res.status(401).send('Missing token');

    // Encode token in state so callback can identify the tenant
    const state = Buffer.from(JSON.stringify({ token })).toString('base64url');

    const params = new URLSearchParams({
      client_id: FB_APP_ID,
      redirect_uri: `${BACKEND_URL}/api/instagram/callback`,
      scope: [
        'instagram_basic',
        'instagram_manage_messages',
        'instagram_manage_comments',
        'pages_read_engagement',
        'pages_show_list',
        'business_management',
      ].join(','),
      response_type: 'code',
      state,
    });

    res.redirect(`https://www.facebook.com/dialog/oauth?${params.toString()}`);
  } catch (err) {
    console.error('[Instagram OAuth] startOAuth error:', err.message);
    res.redirect(`${FRONTEND_URL}/settings?instagram=error`);
  }
}

// ─── OAuth: Step 2 (callback from Facebook) ────────────────────────────────
async function handleCallback(req, res) {
  try {
    const { code, state, error } = req.query;

    if (error) {
      console.warn('[Instagram OAuth] User denied permission:', error);
      return res.send(closePopupScript('denied'));
    }

    if (!code || !state) return res.status(400).send('Invalid callback');

    // Decode state -> get JWT -> verify tenant
    const { token } = JSON.parse(Buffer.from(state, 'base64url').toString());
    const jwt = require('jsonwebtoken');
    const payload = jwt.verify(token, env.jwtSecret);
    const tenantId = payload.tenantId;

    // 1. Exchange code for short-lived user token
    const tokenRes = await axios.get('https://graph.facebook.com/oauth/access_token', {
      params: {
        client_id: FB_APP_ID,
        client_secret: FB_APP_SECRET,
        redirect_uri: `${BACKEND_URL}/api/instagram/callback`,
        code,
      },
    });
    const shortToken = tokenRes.data.access_token;

    // 2. Exchange for long-lived token (60 days)
    const longTokenRes = await axios.get('https://graph.facebook.com/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: FB_APP_ID,
        client_secret: FB_APP_SECRET,
        fb_exchange_token: shortToken,
      },
    });
    const longToken = longTokenRes.data.access_token;

    // 3. Get Facebook pages linked to this user
    const pagesRes = await axios.get('https://graph.facebook.com/me/accounts', {
      params: { access_token: longToken, fields: 'id,name,access_token,instagram_business_account' },
    });

    let instagramAccountId = null;
    let instagramUsername = null;
    let finalToken = longToken;

    // 4. Find the page that has an Instagram Business Account
    for (const page of pagesRes.data.data || []) {
      try {
        const igRes = await axios.get(`https://graph.facebook.com/${page.id}`, {
          params: {
            fields: 'instagram_business_account',
            access_token: page.access_token,
          },
        });

        if (igRes.data.instagram_business_account?.id) {
          instagramAccountId = igRes.data.instagram_business_account.id;
          finalToken = page.access_token; // Use page token for messaging

          // Get Instagram username
          const igDetailRes = await axios.get(`https://graph.facebook.com/${instagramAccountId}`, {
            params: { fields: 'username,name', access_token: page.access_token },
          });
          instagramUsername = igDetailRes.data.username || igDetailRes.data.name || '';
          break;
        }
      } catch {
        // Page might not have Instagram — continue
      }
    }

    // 5. Save to DB settings
    await db.query(
      `INSERT INTO settings (tenant_id, instagram_access_token, instagram_account_id, instagram_username)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tenant_id) DO UPDATE SET
         instagram_access_token = EXCLUDED.instagram_access_token,
         instagram_account_id   = EXCLUDED.instagram_account_id,
         instagram_username     = EXCLUDED.instagram_username`,
      [tenantId, finalToken, instagramAccountId || '', instagramUsername || '']
    );

    console.log(`[Instagram OAuth] Connected for tenant ${tenantId}: @${instagramUsername} (${instagramAccountId})`);

    // 6. Close popup and notify parent window
    res.send(closePopupScript('success'));
  } catch (err) {
    console.error('[Instagram OAuth] handleCallback error:', err.message);
    res.send(closePopupScript('error'));
  }
}

// ─── Disconnect Instagram ────────────────────────────────────────────────────
async function disconnect(req, res) {
  try {
    await db.query(
      `UPDATE settings SET instagram_access_token='', instagram_account_id='', instagram_username='' WHERE tenant_id=$1`,
      [req.user.tenantId]
    );
    res.json({ message: 'Instagram disconnected.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ─── Webhook Verify (GET) ───────────────────────────────────────────────────
function verifyWebhook(req, res) {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[Instagram Webhook] Verified.');
    return res.status(200).send(challenge);
  }
  return res.status(403).json({ message: 'Verification failed.' });
}

// ─── Webhook Receive (POST) ─────────────────────────────────────────────────
async function receiveWebhook(req, res) {
  res.status(200).send('EVENT_RECEIVED');
  const body = req.body;
  if (body.object !== 'instagram') return;

  try {
    for (const entry of body.entry || []) {
      const igAccountId = entry.id;
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;
        for (const msg of (change.value?.messages || [])) {
          if (msg.type !== 'text') continue;
          const senderId = msg.from;
          const text = msg.text?.body || '';
          console.log(`[Instagram DM] From: ${senderId} | Account: ${igAccountId} | "${text}"`);

          const tenantResult = await db.query(
            `SELECT tenant_id FROM settings WHERE instagram_account_id=$1 LIMIT 1`,
            [igAccountId]
          );
          if (!tenantResult.rows.length) continue;
          const tenantId = tenantResult.rows[0].tenant_id;
          await upsertInstagramLead(tenantId, senderId, text);
        }
      }
    }
  } catch (err) {
    console.error('[Instagram Webhook] Error:', err.message);
  }
}

async function upsertInstagramLead(tenantId, igSenderId, messageText) {
  try {
    const existing = await db.query(
      `SELECT id FROM leads WHERE tenant_id=$1 AND instagram_sender_id=$2 LIMIT 1`,
      [tenantId, igSenderId]
    );
    if (existing.rows.length) return;

    const seqRes = await db.query(`SELECT nextval('leads_seq') AS seq`);
    const leadId = `LD-${seqRes.rows[0].seq}`;

    await db.query(
      `INSERT INTO leads (tenant_id, lead_id, customer_name, phone, source, stage, notes, instagram_sender_id, created_at, updated_at)
       VALUES ($1,$2,$3,$4,'Instagram DM','New',$5,$6,NOW(),NOW())`,
      [tenantId, leadId, `Instagram User (${igSenderId})`, igSenderId,
       `First message: "${messageText.substring(0, 200)}"`, igSenderId]
    );
    console.log(`[Instagram DM] New lead ${leadId} created for ${igSenderId}`);
  } catch (err) {
    console.warn(`[Instagram DM] Lead upsert skipped: ${err.message}`);
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function closePopupScript(status) {
  return `<html><body><script>
    window.opener && window.opener.postMessage({ instagramOAuth: '${status}' }, '*');
    window.close();
  </script><p>You can close this window.</p></body></html>`;
}

module.exports = { startOAuth, handleCallback, disconnect, verifyWebhook, receiveWebhook };
