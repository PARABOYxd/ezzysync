const crypto = require('crypto');
const env = require('../config/env');
const { query } = require('../config/db');
const logger = require('../utils/logger').child({ module: 'meta_webhook' });

/**
 * Proves a webhook actually came from Meta.
 *
 * Meta signs every webhook POST with HMAC-SHA256 over the exact raw body,
 * keyed by the app secret, and sends it as `X-Hub-Signature-256`. Nothing
 * checked it, and the endpoint is public by necessity - so anyone who knew the
 * URL could post a payload and have it treated as a real customer message.
 * That is not just noise in an inbox: an injected message creates a lead,
 * opens a conversation, and can trigger an AI auto-reply, which sends a real
 * WhatsApp message and spends the tenant's Gemini quota.
 *
 * Which secret? A tenant that has connected its own Meta app has its own, in
 * settings.whatsapp_app_secret - a column that already existed and that
 * nothing read. Otherwise the platform's FACEBOOK_APP_SECRET applies. Both are
 * tried, because a deployment can have a mix.
 *
 * Reading phone_number_id out of the unverified body to choose a candidate
 * secret is safe: naming someone else's tenant only means the HMAC is checked
 * against that tenant's secret, which the caller does not have.
 */

function signatureMatches(rawBody, secret, received) {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');
  const receivedBuf = Buffer.from(received, 'utf8');
  // Constant-time, so a near-miss reveals nothing about how near.
  return expectedBuf.length === receivedBuf.length && crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

async function tenantAppSecret(body) {
  const phoneId = body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
  if (!phoneId) return null;
  try {
    const { rows } = await query(
      `SELECT whatsapp_app_secret FROM settings
        WHERE whatsapp_phone_number_id = $1 AND COALESCE(whatsapp_app_secret, '') <> ''
        LIMIT 1`,
      [phoneId]
    );
    return rows[0]?.whatsapp_app_secret || null;
  } catch (err) {
    logger.error({ err }, 'Could not load the tenant app secret for signature checking');
    return null;
  }
}

async function verifyMetaSignature(req, res, next) {
  const platformSecret = env.facebook?.appSecret || '';
  const perTenantSecret = await tenantAppSecret(req.body);

  if (!platformSecret && !perTenantSecret) {
    // Refusing here would take a working production webhook offline the moment
    // this ships, so the request goes through - but loudly, every single time,
    // because until a secret is configured this endpoint accepts forgeries.
    logger.error(
      'No Meta app secret configured (FACEBOOK_APP_SECRET or settings.whatsapp_app_secret), ' +
        'so webhook signatures cannot be verified. This endpoint currently accepts forged payloads.'
    );
    return next();
  }

  const header = req.get('X-Hub-Signature-256') || '';
  if (!header.startsWith('sha256=')) {
    logger.warn({ ip: req.ip }, 'Webhook rejected: missing X-Hub-Signature-256');
    return res.sendStatus(401);
  }

  // The signature covers the bytes exactly as sent; a re-serialised req.body
  // would not match, so express.json keeps the raw buffer.
  if (!req.rawBody) {
    logger.error('Raw body missing; cannot verify the webhook signature');
    return res.sendStatus(500);
  }

  const received = header.slice('sha256='.length);
  const candidates = [perTenantSecret, platformSecret].filter(Boolean);
  const valid = candidates.some((secret) => signatureMatches(req.rawBody, secret, received));

  if (!valid) {
    logger.warn({ ip: req.ip }, 'Webhook rejected: signature did not match any configured app secret');
    return res.sendStatus(401);
  }

  return next();
}

module.exports = { verifyMetaSignature };
