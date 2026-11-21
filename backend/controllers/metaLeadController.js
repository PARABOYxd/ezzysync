const env = require('../config/env');
const metaLeadService = require('../services/metaLeadService');
const auditService = require('../services/auditService');
const logger = require('../utils/logger').child({ module: 'metaLeads' });

/** Everything the Settings screen needs in one call. */
async function overview(req, res, next) {
  try {
    const tenantId = req.user.tenantId;
    const [pages, options] = await Promise.all([
      metaLeadService.listPages(tenantId),
      metaLeadService.formOptions(tenantId),
    ]);
    res.json({
      configured: metaLeadService.isConfigured(),
      webhookUrl: `${env.backendUrl}/api/webhooks/meta-leads`,
      pages,
      options,
    });
  } catch (err) {
    next(err);
  }
}

/** The popup opens this; it sends the agent to Facebook. The JWT rides in `state`. */
function startOAuth(req, res) {
  const token = req.query.token;
  if (!token) return res.status(401).send('Missing token');
  if (!metaLeadService.isConfigured()) return res.status(503).send(closePopup('error'));
  return res.redirect(metaLeadService.buildAuthorizeUrl(token));
}

async function handleCallback(req, res) {
  const { code, state, error } = req.query;
  if (error) return res.send(closePopup('denied'));
  if (!code || !state) return res.status(400).send('Invalid callback');

  try {
    const result = await metaLeadService.connectFromCallback(code, state);
    logger.info({ tenantId: result.tenantId, found: result.found, taken: result.taken.length }, 'Facebook pages listed for lead ads');
    return res.send(closePopup('success'));
  } catch (err) {
    logger.error({ err: err.response?.data?.error?.message || err.message }, 'Meta lead ads sign-in failed');
    return res.send(closePopup('error'));
  }
}

async function connect(req, res, next) {
  try {
    const page = await metaLeadService.connectPage(req.user.tenantId, req.params.id, req.body);
    if (!page) return res.status(404).json({ message: 'Page not found.' });
    await auditService.logAction(req, 'CONNECT_META_LEAD_PAGE', { id: page.id, name: page.pageName });
    res.json({ page });
  } catch (err) {
    next(err);
  }
}

async function setPaused(req, res, next) {
  try {
    const page = await metaLeadService.setPaused(req.user.tenantId, req.params.id, req.body?.paused);
    if (!page) return res.status(404).json({ message: 'Page not found.' });
    res.json({ page });
  } catch (err) {
    next(err);
  }
}

async function disconnect(req, res, next) {
  try {
    const page = await metaLeadService.disconnectPage(req.user.tenantId, req.params.id);
    if (!page) return res.status(404).json({ message: 'Page not found.' });
    await auditService.logAction(req, 'DISCONNECT_META_LEAD_PAGE', { id: page.id, name: page.pageName });
    res.json({ page });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    if (!(await metaLeadService.removePage(req.user.tenantId, req.params.id))) {
      return res.status(404).json({ message: 'Page not found.' });
    }
    // Leads already captured stay; this only stops new ones.
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/* --------------------------------------------------------------- webhook */

/** Meta's one-time handshake when the callback URL is saved in the app dashboard. */
function verifyWebhook(req, res) {
  if (metaLeadService.isValidVerification(req.query['hub.mode'], req.query['hub.verify_token'])) {
    return res.status(200).send(req.query['hub.challenge']);
  }
  return res.status(403).json({ message: 'Verification failed.' });
}

/**
 * Answered straight away: Meta treats a slow reply as a failure and retries.
 * The leads are recorded first and fetched after, so nothing is lost if the
 * fetch fails.
 */
async function receiveWebhook(req, res) {
  res.status(200).send('EVENT_RECEIVED');
  try {
    await metaLeadService.handleWebhook(req.body);
  } catch (err) {
    logger.error({ err: err.message }, 'Meta leads webhook processing failed');
  }
}

function closePopup(status) {
  return `<html><body><script>
    window.opener && window.opener.postMessage({ metaLeadsOAuth: '${status}' }, '*');
    window.close();
  </script><p>You can close this window.</p></body></html>`;
}

module.exports = { overview, startOAuth, handleCallback, connect, setPaused, disconnect, remove, verifyWebhook, receiveWebhook };
