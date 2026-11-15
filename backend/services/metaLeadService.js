const axios = require('axios');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const metaLeadRepository = require('../repositories/metaLeadRepository');
const leadSheetRepository = require('../repositories/leadSheetRepository');
const leadSheetService = require('./leadSheetService');
const { LEAD_STAGES } = require('../models/leadSchema');
const logger = require('../utils/logger').child({ module: 'metaLeads' });

/**
 * Meta Lead Ads straight into the CRM.
 *
 * The agent signs in with Facebook; each page they manage is listed, and
 * connecting one subscribes it to Meta's `leadgen` webhook. A form submission
 * arrives as a lead id, the lead is fetched with that page's token, and it
 * goes through the same path as a Google Sheet row (column matching, phone
 * de-duplication, assignment, timeline note).
 *
 * Going live for other agencies needs Meta's App Review for `leads_retrieval`
 * and `pages_manage_metadata` and a verified business. Until then it works for
 * people with a role on the Meta app.
 */

const GRAPH = `https://graph.facebook.com/${env.metaLeads.graphVersion}`;
const GRAPH_TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 5;

const OAUTH_SCOPES = [
  'leads_retrieval',
  'pages_show_list',
  'pages_manage_metadata',
  'pages_read_engagement',
  'pages_manage_ads',
  'business_management',
];

// Forces localhost in dev, like the Instagram connection, so the popup can return.
const BACKEND_URL = env.nodeEnv === 'development' ? `http://localhost:${env.port}` : env.backendUrl;
const REDIRECT_URI = `${BACKEND_URL}/api/meta-leads/callback`;

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

/** Whether this deployment has a Meta app to sign in with. The screen explains if not. */
function isConfigured() {
  return Boolean(env.facebook.appId && env.facebook.appSecret && env.tokenEncryptionKey);
}

/** What Meta says went wrong, without the request URL (which contains a token). */
function graphMessage(err) {
  return err?.response?.data?.error?.message || err?.message || 'Meta did not answer.';
}

/* ----------------------------------------------------------------- login */

function buildAuthorizeUrl(userJwt) {
  const state = Buffer.from(JSON.stringify({ token: userJwt })).toString('base64url');
  const params = new URLSearchParams({
    client_id: env.facebook.appId,
    redirect_uri: REDIRECT_URI,
    scope: OAUTH_SCOPES.join(','),
    response_type: 'code',
    state,
  });
  return `https://www.facebook.com/dialog/oauth?${params.toString()}`;
}

function tenantIdFromState(state) {
  const { token } = JSON.parse(Buffer.from(state, 'base64url').toString());
  return jwt.verify(token, env.jwtSecret).tenantId;
}

/** Code -> long-lived user token. Page tokens taken from it do not expire. */
async function exchangeCode(code) {
  const common = { client_id: env.facebook.appId, client_secret: env.facebook.appSecret };
  const short = await axios.get(`${GRAPH}/oauth/access_token`, {
    params: { ...common, redirect_uri: REDIRECT_URI, code }, timeout: GRAPH_TIMEOUT_MS,
  });
  const long = await axios.get(`${GRAPH}/oauth/access_token`, {
    params: { ...common, grant_type: 'fb_exchange_token', fb_exchange_token: short.data.access_token }, timeout: GRAPH_TIMEOUT_MS,
  });
  return long.data.access_token;
}

async function listManagedPages(userToken) {
  const res = await axios.get(`${GRAPH}/me/accounts`, {
    params: { access_token: userToken, fields: 'id,name,access_token', limit: 100 }, timeout: GRAPH_TIMEOUT_MS,
  });
  return (res.data.data || [])
    .filter((p) => p.id && p.access_token)
    .map((p) => ({ id: p.id, name: p.name, token: p.access_token }));
}

/** The popup's return trip: who signed in, which pages can they manage. */
async function connectFromCallback(code, state) {
  const tenantId = tenantIdFromState(state);
  const pages = await listManagedPages(await exchangeCode(code));
  const result = await metaLeadRepository.upsertAvailable(tenantId, pages);
  return { tenantId, found: pages.length, ...result };
}

/* ----------------------------------------------------------------- pages */

function clampText(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

async function normalizeConfig(tenantId, body = {}) {
  const assignMode = body.assignMode === 'agent' ? 'agent' : body.assignMode === 'unassigned' ? 'unassigned' : 'round_robin';
  const assignedTo = assignMode === 'agent' ? clampText(body.assignedTo, 120) : '';
  if (assignMode === 'agent') {
    if (!assignedTo) throw badRequest('Choose which team member gets these leads, or pick Round-Robin.');
    if (!(await leadSheetService.teamNames(tenantId)).includes(assignedTo)) throw badRequest(`${assignedTo} is not on your team.`);
  }

  const formTrips = {};
  for (const [formId, trip] of Object.entries(body.formTrips || {})) {
    if (/^\d{5,30}$/.test(formId) && String(trip || '').trim()) formTrips[formId] = clampText(trip, 200);
  }

  return {
    tripName: clampText(body.tripName, 200),
    formTrips,
    assignMode,
    assignedTo,
    defaultStage: LEAD_STAGES.includes(body.defaultStage) ? body.defaultStage : 'New',
    sourceLabel: clampText(body.sourceLabel, 60) || leadSheetService.SOURCE_DEFAULT,
  };
}

const toPublic = (page) => ({ ...page, tenantId: undefined, rrCursor: undefined });

async function listPages(tenantId) {
  const pages = await metaLeadRepository.listByTenant(tenantId);
  return pages.map(toPublic);
}

async function formOptions(tenantId) {
  const [trips, team] = await Promise.all([leadSheetRepository.listTripNames(tenantId), leadSheetService.teamNames(tenantId)]);
  return { trips, team, stages: LEAD_STAGES, defaultSource: leadSheetService.SOURCE_DEFAULT };
}

/** Starts (or re-saves) delivery of a page's leads. */
async function connectPage(tenantId, id, body, { subscribe = subscribePage } = {}) {
  const page = await metaLeadRepository.findById(tenantId, id, { withToken: true });
  if (!page) return null;

  const config = await normalizeConfig(tenantId, body);
  try {
    await subscribe(page.pageId, page.token);
  } catch (err) {
    throw badRequest(`Meta would not let us receive this page's leads: ${graphMessage(err)}`);
  }
  return toPublic(await metaLeadRepository.activate(tenantId, id, config));
}

async function subscribePage(pageId, token) {
  await axios.post(`${GRAPH}/${pageId}/subscribed_apps`, null, {
    params: { subscribed_fields: 'leadgen', access_token: token }, timeout: GRAPH_TIMEOUT_MS,
  });
}

async function unsubscribePage(pageId, token) {
  await axios.delete(`${GRAPH}/${pageId}/subscribed_apps`, { params: { access_token: token }, timeout: GRAPH_TIMEOUT_MS });
}

/** Best effort: Meta being unreachable must not stop the agent disconnecting. */
async function release(tenantId, id, { unsubscribe }) {
  const page = await metaLeadRepository.findById(tenantId, id, { withToken: true });
  if (!page) return null;
  if (page.status === 'active') {
    try {
      await unsubscribe(page.pageId, page.token);
    } catch (err) {
      logger.warn({ pageId: page.pageId, err: graphMessage(err) }, 'Could not unsubscribe the page from Meta');
    }
  }
  return page;
}

async function disconnectPage(tenantId, id, { unsubscribe = unsubscribePage } = {}) {
  if (!(await release(tenantId, id, { unsubscribe }))) return null;
  return toPublic(await metaLeadRepository.deactivate(tenantId, id));
}

async function removePage(tenantId, id, { unsubscribe = unsubscribePage } = {}) {
  if (!(await release(tenantId, id, { unsubscribe }))) return false;
  return metaLeadRepository.remove(tenantId, id);
}

async function setPaused(tenantId, id, paused) {
  const page = await metaLeadRepository.setPaused(tenantId, id, paused);
  return page ? toPublic(page) : null;
}

/* --------------------------------------------------------------- webhook */

/** Meta's lead object, with its ad details when the token is allowed to see them. */
async function fetchLead(leadgenId, token) {
  const get = (fields) => axios.get(`${GRAPH}/${leadgenId}`, {
    params: { access_token: token, fields }, timeout: GRAPH_TIMEOUT_MS,
  });
  try {
    return (await get('created_time,field_data,ad_name,campaign_name,form_id,platform')).data;
  } catch (err) {
    // An expired token is not going to work with fewer fields either.
    if (err?.response?.data?.error?.code === 190) throw err;
    return (await get('created_time,field_data')).data;
  }
}

/**
 * A lead form submission as one row, in the same shape a Google Sheet export
 * has, so the sheet pipeline reads it unchanged. The ad's own details go in
 * after the customer's, and end up in the lead's notes.
 */
function leadToRow(lead) {
  const columns = ['created_time'];
  const values = [lead.created_time || ''];
  for (const key of ['ad_name', 'campaign_name', 'platform']) {
    if (lead[key]) { columns.push(key); values.push(String(lead[key])); }
  }
  for (const field of lead.field_data || []) {
    if (!field?.name) continue;
    columns.push(field.name);
    values.push((field.values || []).join(', '));
  }
  return { columns, row: values };
}

/** Fetches one announced lead and files it. Safe to call again: a finished lead is skipped. */
async function processLead(leadgenId, { fetch = fetchLead } = {}) {
  const event = await metaLeadRepository.getEvent(leadgenId);
  if (!event || event.status !== 'pending') return { status: event?.status || 'unknown', imported: 0 };

  const page = await metaLeadRepository.findActiveByPageId(event.page_id, { withToken: true });
  if (!page) {
    await metaLeadRepository.finishEvent(leadgenId, { status: 'failed', error: 'The page is no longer connected.' });
    return { status: 'failed', imported: 0 };
  }

  try {
    const lead = await fetch(leadgenId, page.token);
    const { columns, row } = leadToRow(lead);

    const adName = columns.includes('ad_name') ? row[columns.indexOf('ad_name')] : '';
    const trip = page.formTrips[event.form_id || lead.form_id] || page.tripName || adName;

    const done = await leadSheetService.importRows(
      { ...page, tripMode: 'fixed', tripName: trip, tripColumn: '', columnMapping: {} },
      columns,
      [row],
      { timelineNote: `Lead automatically captured from Meta Lead Ad: ${page.pageName}`, actor: 'Meta Lead Ads' }
    );

    await metaLeadRepository.recordLead(page.id, { imported: done.imported, rrCursor: done.rrCursor });
    await metaLeadRepository.finishEvent(leadgenId, { status: 'done' });
    return { status: 'done', imported: done.imported };
  } catch (err) {
    const message = graphMessage(err);
    const expired = err?.response?.data?.error?.code === 190;
    const giveUp = expired || err.unread || event.attempts + 1 >= MAX_ATTEMPTS;
    await metaLeadRepository.finishEvent(leadgenId, { status: giveUp ? 'failed' : 'pending', error: message });
    await metaLeadRepository.recordError(page.id, expired
      ? 'Facebook access expired. Press "Connect with Facebook" again.'
      : message);
    logger.warn({ leadgenId, pageId: page.pageId, err: message, giveUp }, 'Could not file a Meta lead');
    return { status: giveUp ? 'failed' : 'pending', imported: 0 };
  }
}

/**
 * Handles a webhook delivery. Every lead announced is recorded before it is
 * fetched, so a crash or a Meta outage in between leaves it queued for retry
 * instead of lost.
 */
async function handleWebhook(body, { fetch } = {}) {
  const summary = { received: 0, duplicates: 0, unknownPage: 0, imported: 0 };

  for (const entry of body?.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'leadgen') continue;
      const { leadgen_id: leadgenId, page_id: pageId, form_id: formId } = change.value || {};
      if (!leadgenId || !pageId) continue;
      summary.received += 1;

      const page = await metaLeadRepository.findActiveByPageId(String(pageId));
      if (!page) { summary.unknownPage += 1; continue; }

      const isNew = await metaLeadRepository.registerEvent({
        leadgenId: String(leadgenId), tenantId: page.tenantId, pageId: String(pageId), formId: formId ? String(formId) : '',
      });
      if (!isNew) { summary.duplicates += 1; continue; }

      const result = await processLead(String(leadgenId), { fetch });
      summary.imported += result.imported;
    }
  }
  return summary;
}

/** Cron: leads whose fetch failed earlier. */
async function retryPending({ fetch } = {}) {
  let imported = 0;
  const ids = await metaLeadRepository.listRetryable();
  for (const id of ids) imported += (await processLead(id, { fetch })).imported;
  return { retried: ids.length, imported };
}

function isValidVerification(mode, token) {
  const expected = env.metaLeads.webhookVerifyToken;
  return Boolean(expected) && mode === 'subscribe' && token === expected;
}

module.exports = {
  OAUTH_SCOPES,
  isConfigured,
  buildAuthorizeUrl,
  connectFromCallback,
  listPages,
  formOptions,
  connectPage,
  disconnectPage,
  removePage,
  setPaused,
  handleWebhook,
  retryPending,
  processLead,
  isValidVerification,
  // exported for tests
  leadToRow,
};
