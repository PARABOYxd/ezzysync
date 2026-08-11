const axios = require('axios');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const settingsRepository = require('../repositories/settingsRepository');
const leadRepository = require('../repositories/leadRepository');

const VERIFY_TOKEN = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || 'ezzysync_ig_webhook_2024';
const FB_APP_ID = process.env.FACEBOOK_APP_ID || '';
const FB_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '';
const BACKEND_URL = process.env.NODE_ENV === 'development'
  ? `http://localhost:${process.env.PORT || 5001}`
  : (process.env.BACKEND_URL || 'https://ezzysync-production.up.railway.app');

const REDIRECT_URI = `${BACKEND_URL}/api/instagram/callback`;

const OAUTH_SCOPES = [
  'instagram_basic',
  'instagram_manage_messages',
  'instagram_manage_comments',
  'pages_read_engagement',
  'pages_show_list',
  'business_management',
];

/** Facebook login URL for step 1 of the popup OAuth flow. The caller's JWT is
 * encoded into `state` so the callback can identify the tenant. */
function buildAuthorizeUrl(token) {
  const state = Buffer.from(JSON.stringify({ token })).toString('base64url');
  const params = new URLSearchParams({
    client_id: FB_APP_ID,
    redirect_uri: REDIRECT_URI,
    scope: OAUTH_SCOPES.join(','),
    response_type: 'code',
    state,
  });
  return `https://www.facebook.com/dialog/oauth?${params.toString()}`;
}

function tenantIdFromState(state) {
  const { token } = JSON.parse(Buffer.from(state, 'base64url').toString());
  const payload = jwt.verify(token, env.jwtSecret);
  return payload.tenantId;
}

async function exchangeCodeForLongLivedToken(code) {
  // 1. Exchange code for short-lived user token
  const tokenRes = await axios.get('https://graph.facebook.com/oauth/access_token', {
    params: {
      client_id: FB_APP_ID,
      client_secret: FB_APP_SECRET,
      redirect_uri: REDIRECT_URI,
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
  return longTokenRes.data.access_token;
}

/**
 * Walks the user's Facebook pages looking for one with a linked Instagram
 * Business Account. Falls back to the plain long-lived user token when no
 * page qualifies, matching the original inline behaviour.
 */
async function resolveInstagramAccount(longToken) {
  const pagesRes = await axios.get('https://graph.facebook.com/me/accounts', {
    params: { access_token: longToken, fields: 'id,name,access_token,instagram_business_account' },
  });

  for (const page of pagesRes.data.data || []) {
    try {
      const igRes = await axios.get(`https://graph.facebook.com/${page.id}`, {
        params: {
          fields: 'instagram_business_account',
          access_token: page.access_token,
        },
      });

      if (igRes.data.instagram_business_account?.id) {
        const instagramAccountId = igRes.data.instagram_business_account.id;

        // Get Instagram username
        const igDetailRes = await axios.get(`https://graph.facebook.com/${instagramAccountId}`, {
          params: { fields: 'username,name', access_token: page.access_token },
        });

        return {
          instagramAccountId,
          instagramUsername: igDetailRes.data.username || igDetailRes.data.name || '',
          finalToken: page.access_token, // Use page token for messaging
        };
      }
    } catch {
      // Page might not have Instagram — continue
    }
  }

  return { instagramAccountId: null, instagramUsername: null, finalToken: longToken };
}

/** Full step-2 callback flow: state -> tenant, code -> token, token -> account,
 * then persist. Returns the connected account for logging. */
async function connectFromCallback(code, state) {
  const tenantId = tenantIdFromState(state);
  const longToken = await exchangeCodeForLongLivedToken(code);
  const { instagramAccountId, instagramUsername, finalToken } = await resolveInstagramAccount(longToken);

  await settingsRepository.upsertInstagramCredentials(tenantId, {
    accessToken: finalToken,
    accountId: instagramAccountId || '',
    username: instagramUsername || '',
  });

  return { tenantId, instagramAccountId, instagramUsername };
}

async function disconnect(tenantId) {
  await settingsRepository.clearInstagramCredentials(tenantId);
}

function isValidWebhookVerification(mode, token) {
  return mode === 'subscribe' && token === VERIFY_TOKEN;
}

/**
 * Turns an inbound Instagram DM into a lead the first time we see a sender.
 * Deliberately swallows its own errors: this runs after the webhook has
 * already been acknowledged, so a failure must not surface anywhere.
 */
async function upsertInstagramLead(tenantId, igSenderId, messageText) {
  try {
    const existing = await leadRepository.getLeadByInstagramSenderId(tenantId, igSenderId);
    if (existing) return;

    const seq = await leadRepository.nextLeadSeq();
    const leadId = `LD-${seq}`;

    await leadRepository.insertInstagramLead(
      tenantId,
      leadId,
      `Instagram User (${igSenderId})`,
      igSenderId,
      `First message: "${messageText.substring(0, 200)}"`,
      igSenderId
    );
    // eslint-disable-next-line no-console
    console.log(`[Instagram DM] New lead ${leadId} created for ${igSenderId}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[Instagram DM] Lead upsert skipped: ${err.message}`);
  }
}

/** Processes a verified `instagram` webhook payload, creating leads for any
 * new text-message senders. */
async function processWebhookEvent(body) {
  if (body.object !== 'instagram') return;

  for (const entry of body.entry || []) {
    const igAccountId = entry.id;
    for (const change of entry.changes || []) {
      if (change.field !== 'messages') continue;
      for (const msg of (change.value?.messages || [])) {
        if (msg.type !== 'text') continue;
        const senderId = msg.from;
        const text = msg.text?.body || '';
        // eslint-disable-next-line no-console
        console.log(`[Instagram DM] From: ${senderId} | Account: ${igAccountId} | "${text}"`);

        const tenantId = await settingsRepository.getTenantIdByInstagramAccountId(igAccountId);
        if (!tenantId) continue;
        await upsertInstagramLead(tenantId, senderId, text);
      }
    }
  }
}

module.exports = {
  buildAuthorizeUrl,
  connectFromCallback,
  disconnect,
  isValidWebhookVerification,
  processWebhookEvent,
};
