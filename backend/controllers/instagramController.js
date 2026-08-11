const env = require('../config/env');
const instagramService = require('../services/instagramService');

const FRONTEND_URL = env.frontendUrl || 'http://localhost:5173';

// ─── OAuth: Step 1 ─────────────────────────────────────────────────────────
// Frontend opens this in a popup. We redirect to Facebook login.
async function startOAuth(req, res) {
  try {
    const token = req.query.token; // JWT passed from frontend popup
    if (!token) return res.status(401).send('Missing token');

    res.redirect(instagramService.buildAuthorizeUrl(token));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Instagram OAuth] startOAuth error:', err.message);
    res.redirect(`${FRONTEND_URL}/settings?instagram=error`);
  }
}

// ─── OAuth: Step 2 (callback from Facebook) ────────────────────────────────
async function handleCallback(req, res) {
  try {
    const { code, state, error } = req.query;

    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[Instagram OAuth] User denied permission:', error);
      return res.send(closePopupScript('denied'));
    }

    if (!code || !state) return res.status(400).send('Invalid callback');

    const { tenantId, instagramAccountId, instagramUsername } =
      await instagramService.connectFromCallback(code, state);

    // eslint-disable-next-line no-console
    console.log(`[Instagram OAuth] Connected for tenant ${tenantId}: @${instagramUsername} (${instagramAccountId})`);

    // Close popup and notify parent window
    res.send(closePopupScript('success'));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Instagram OAuth] handleCallback error:', err.message);
    res.send(closePopupScript('error'));
  }
}

// ─── Disconnect Instagram ────────────────────────────────────────────────────
async function disconnect(req, res) {
  try {
    await instagramService.disconnect(req.user.tenantId);
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
  if (instagramService.isValidWebhookVerification(mode, token)) {
    // eslint-disable-next-line no-console
    console.log('[Instagram Webhook] Verified.');
    return res.status(200).send(challenge);
  }
  return res.status(403).json({ message: 'Verification failed.' });
}

// ─── Webhook Receive (POST) ─────────────────────────────────────────────────
async function receiveWebhook(req, res) {
  res.status(200).send('EVENT_RECEIVED');
  try {
    await instagramService.processWebhookEvent(req.body);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Instagram Webhook] Error:', err.message);
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
