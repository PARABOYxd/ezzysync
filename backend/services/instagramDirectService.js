const {
  IgApiClient,
  IgLoginTwoFactorRequiredError,
  IgCheckpointError,
  IgLoginRequiredError,
} = require('instagram-private-api');
const instagramDirectRepo = require('../repositories/instagramDirectRepository');
const leadRepository = require('../repositories/leadRepository');
const whatsappRepo = require('../repositories/whatsappRepository');
const whatsappWebRepository = require('../repositories/whatsappWebRepository');
const aiService = require('./aiService');
const planService = require('./planService');
const { broadcastToTenant } = require('./websocketService');
const logger = require('../utils/logger');
const { encrypt, decrypt } = require('../utils/encryption');
const { query } = require('../config/db');

// Map of active IgApiClient instances per tenantId
const activeClients = new Map(); // tenantId -> { ig, username, accountId, status, poller }
const processedMessageIds = new Set();

/**
 * Stores the Instagram login so a dropped session can be re-established
 * without asking the agency to type its password again.
 *
 * This is real AES encryption via utils/encryption, the same helper the Gmail
 * refresh tokens use. The previous version base64-encoded the password and
 * called that "not plaintext" - base64 is an encoding, not a secret, and
 * anyone with a read of this table could decode every tenant's Instagram
 * password in one line.
 *
 * Legacy base64 rows are still readable so existing connections keep working;
 * they are re-encrypted the next time the credentials are written.
 */
function encodeCreds(username, password) {
  return encrypt(JSON.stringify({ u: username, p: password }));
}

function decodeCreds(stored) {
  if (!stored) return null;

  // AES payloads from utils/encryption are "iv:tag:ciphertext".
  if (stored.includes(':')) {
    try {
      const parsed = JSON.parse(decrypt(stored));
      return { username: parsed.u, password: parsed.p };
    } catch (err) {
      logger.warn({ err }, '[instagramDirect] Could not decrypt stored credentials');
      return null;
    }
  }

  // Legacy base64 row written before encryption was introduced.
  try {
    const parsed = JSON.parse(Buffer.from(stored, 'base64').toString('utf8'));
    return { username: parsed.u, password: parsed.p };
  } catch {
    return null;
  }
}

/**
 * Serializes IgApiClient state (cookies + state keys) into JSON string.
 */
async function serializeIgState(ig) {
  try {
    const cookies = await ig.state.serializeCookieJar();
    const stateObj = {
      cookies,
      deviceString: ig.state.deviceString,
      deviceId: ig.state.deviceId,
      uuid: ig.state.uuid,
      phoneId: ig.state.phoneId,
      adId: ig.state.adId,
      build: ig.state.build,
    };
    return JSON.stringify(stateObj);
  } catch (err) {
    logger.error({ err }, '[instagramDirectService] Error serializing IG state');
    return '';
  }
}

/**
 * Restores IgApiClient state from JSON string.
 */
async function deserializeIgState(ig, sessionDataStr, accountId = null) {
  if (!sessionDataStr) return;
  try {
    const parsed = JSON.parse(sessionDataStr);
    if (parsed.cookies) {
      await ig.state.deserializeCookieJar(parsed.cookies);
    }
    if (parsed.deviceId) ig.state.deviceId = parsed.deviceId;
    if (parsed.uuid) ig.state.uuid = parsed.uuid;
    if (parsed.phoneId) ig.state.phoneId = parsed.phoneId;
    if (parsed.adId) ig.state.adId = parsed.adId;
    if (parsed.deviceString) ig.state.deviceString = parsed.deviceString;
    if (parsed.build) ig.state.build = parsed.build;
    if (accountId) {
      ig.state.cookieUserId = String(accountId);
    }
  } catch (err) {
    logger.warn({ err }, '[instagramDirectService] Failed to deserialize IG session state');
  }
}

/**
 * Performs a full fresh login. Returns { ig, accountId } or throws.
 */
/** A client seeded from the username, which is how instagram-private-api
 *  derives a stable device fingerprint for an account. */
function createIgClient(username) {
  const ig = new IgApiClient();
  ig.state.generateDevice(username);
  return ig;
}

async function performFreshLogin(username, password, existingIg = null) {
  const ig = existingIg || createIgClient(username);

  // Pre-login flow to appear like a real device
  try {
    await ig.simulate.preLoginFlow();
  } catch (e) {
    // Pre-login flow can fail on some endpoints, not critical
    logger.debug({ err: e.message }, '[instagramDirectService] preLoginFlow partial');
  }

  let user;
  try {
    user = await ig.account.login(username, password);
  } catch (err) {
    // 2FA and checkpoint challenges are continued on THIS client - the one
    // holding the session and challenge state that the failed login just
    // established. Starting a fresh client to answer the challenge, as this
    // used to, throws that state away and the verification can never complete.
    err.ig = ig;
    throw err;
  }

  // Wait before making any API calls to avoid rate-limits
  await new Promise(r => setTimeout(r, 3000));

  // Post-login flow (non-blocking)
  try {
    process.nextTick(async () => {
      try { await ig.simulate.postLoginFlow(); } catch (_) {}
    });
  } catch (_) {}

  return { ig, accountId: String(user.pk) };
}

/**
 * Initiates direct login with Username & Password.
 */
async function loginWithCredentials(tenantId, username, password) {
  if (!username || !password) {
    throw new Error('Username and password are required.');
  }

  const cleanUsername = username.trim().toLowerCase();

  try {
    const { ig, accountId } = await performFreshLogin(cleanUsername, password);

    const serializedState = await serializeIgState(ig);
    await instagramDirectRepo.saveSession(tenantId, {
      username: cleanUsername,
      accountId,
      sessionData: serializedState,
      status: 'connected',
      encryptedCreds: encodeCreds(cleanUsername, password),
    });

    activeClients.set(tenantId, {
      ig,
      username: cleanUsername,
      accountId,
      status: 'connected',
    });

    startInboxPoller(tenantId);

    logger.info({ tenantId, username: cleanUsername }, '[instagramDirectService] Direct Instagram connected successfully!');
    return { status: 'connected', username: cleanUsername, accountId };

  } catch (err) {
    if (err instanceof IgLoginTwoFactorRequiredError) {
      const twoFactorInfo = err.response.body.two_factor_info;
      logger.warn({ tenantId, username: cleanUsername }, '[instagramDirectService] 2FA Code required');

      // Continue on the client that raised the challenge.
      const ig = err.ig || createIgClient(cleanUsername);

      activeClients.set(tenantId, {
        ig,
        username: cleanUsername,
        twoFactorInfo,
        status: 'challenge_required',
        _pendingPassword: password, // kept in memory only for 2FA completion
      });

      await instagramDirectRepo.updateStatus(tenantId, 'challenge_required', {
        twoFactorInfo,
        username: cleanUsername,
      });

      return {
        status: 'challenge_required',
        step: '2fa',
        message: 'Two-factor authentication required. Please submit the 6-digit code sent to your phone/authenticator.',
        twoFactorInfo,
      };

    } else if (err instanceof IgCheckpointError) {
      logger.warn({ tenantId, username: cleanUsername }, '[instagramDirectService] Security Checkpoint required');
      
      const ig = err.ig || createIgClient(cleanUsername);

      try {
        await ig.challenge.auto(true);
      } catch (challengeErr) {
        logger.warn({ err: challengeErr.message, tenantId }, '[instagramDirectService] Could not start Instagram challenge');
      }
      const challengeState = ig.state.challenge;

      activeClients.set(tenantId, {
        ig,
        username: cleanUsername,
        challengeState,
        status: 'challenge_required',
      });

      await instagramDirectRepo.updateStatus(tenantId, 'challenge_required', {
        challengeState,
        username: cleanUsername,
      });

      return {
        status: 'challenge_required',
        step: 'checkpoint',
        message: 'Instagram security checkpoint triggered. A verification code has been sent via SMS/Email.',
      };
    }

    logger.error({ err: err.message, tenantId, username: cleanUsername }, '[instagramDirectService] Login failed');
    throw new Error(err.message || 'Instagram direct login failed. Check credentials.');
  }
}

/**
 * Submits 2FA or Security OTP verification code.
 */
async function submitVerificationCode(tenantId, code) {
  const clientData = activeClients.get(tenantId);
  const dbSession = await instagramDirectRepo.getSession(tenantId);

  if (!clientData?.ig && !dbSession) {
    throw new Error('No active login challenge session found. Please re-enter your username and password.');
  }

  const ig = clientData?.ig || new IgApiClient();
  if (dbSession?.session_data) {
    await deserializeIgState(ig, dbSession.session_data);
  }

  const cleanCode = String(code).trim();

  try {
    let user;
    if (clientData?.twoFactorInfo) {
      const { two_factor_identifier, username } = clientData.twoFactorInfo;
      user = await ig.account.twoFactorLogin({
        username: username || clientData.username,
        verificationCode: cleanCode,
        twoFactorIdentifier: two_factor_identifier,
        verificationMethod: '1', // 1: SMS / app
      });
    } else {
      await ig.challenge.sendSecurityCode(cleanCode);
      user = await ig.account.currentUser();
    }

    const accountId = String(user.pk || ig.state.cookieUserId);
    const username = user.username || clientData?.username || dbSession?.username || '';
    const serializedState = await serializeIgState(ig);

    // Store creds if available from the pending login
    const pendingPassword = clientData?._pendingPassword;
    await instagramDirectRepo.saveSession(tenantId, {
      username,
      accountId,
      sessionData: serializedState,
      status: 'connected',
      encryptedCreds: pendingPassword ? encodeCreds(username, pendingPassword) : null,
    });

    activeClients.set(tenantId, {
      ig,
      username,
      accountId,
      status: 'connected',
    });

    startInboxPoller(tenantId);

    logger.info({ tenantId, username }, '[instagramDirectService] 2FA Challenge verified successfully!');
    return { status: 'connected', username, accountId };

  } catch (err) {
    logger.error({ err: err.message, tenantId }, '[instagramDirectService] Failed to verify 2FA/Checkpoint code');
    throw new Error(err.message || 'Invalid verification code. Please try again.');
  }
}

/**
 * Starts background poller with exponential backoff on errors.
 */
function startInboxPoller(tenantId) {
  const existing = activeClients.get(tenantId);
  if (existing?.poller) {
    clearInterval(existing.poller);
  }

  logger.info({ tenantId }, '[instagramDirectService] Starting direct inbox DM poller');

  let consecutiveErrors = 0;

  // Instagram rate-limits (error 467) an unofficial client that polls hard,
  // especially right after a login from a new device. 20s between inbox
  // fetches - two API calls each - was enough to get every cycle rejected, so
  // no DM ever arrived. A minute is still responsive for a CRM inbox and stays
  // under the limit. Both are overridable if an account needs it tuned.
  const BASE_INTERVAL = Number(process.env.IG_POLL_INTERVAL_MS) || 60000;
  const MAX_INTERVAL = 300000; // 5 minutes max backoff

  async function poll() {
    try {
      await pollInbox(tenantId);
      consecutiveErrors = 0; // Reset on success
    } catch (err) {
      consecutiveErrors++;
      const errMsg = String(err.message || '');
      if (errMsg.includes('467')) {
        // Rate-limited - backoff significantly
        const backoff = Math.min(BASE_INTERVAL * Math.pow(2, consecutiveErrors), MAX_INTERVAL);
        logger.warn({ tenantId, backoffMs: backoff, consecutiveErrors }, '[instagramDirectService] 467 rate-limit - backing off');
      } else {
        logger.warn({ err: errMsg, tenantId }, '[instagramDirectService] DM poller cycle error');
      }
    }

    // Schedule next poll with backoff
    const client = activeClients.get(tenantId);
    if (!client || client.status !== 'connected') return; // Stop if disconnected

    const delay = consecutiveErrors > 0
      ? Math.min(BASE_INTERVAL * Math.pow(2, consecutiveErrors), MAX_INTERVAL)
      : BASE_INTERVAL;

    client.poller = setTimeout(poll, delay);
  }

  // A freshly logged-in session needs to settle before its first request.
  // Polling five seconds after login is what Instagram was rejecting.
  const firstDelay = Number(process.env.IG_FIRST_POLL_DELAY_MS) || 45000;
  logger.info({ tenantId, firstDelayMs: firstDelay, intervalMs: BASE_INTERVAL }, '[instagramDirectService] Poller scheduled');

  const client = activeClients.get(tenantId) || {};
  client.poller = setTimeout(poll, firstDelay);
}

/**
 * Attempts a full re-login using stored credentials. Returns true if successful.
 */
async function attemptReLogin(tenantId) {
  const dbSession = await instagramDirectRepo.getSession(tenantId);
  if (!dbSession?.encrypted_creds) {
    logger.warn({ tenantId }, '[instagramDirectService] No stored credentials for auto-re-login. User must reconnect from Settings.');
    return false;
  }

  const creds = decodeCreds(dbSession.encrypted_creds);
  if (!creds) {
    logger.warn({ tenantId }, '[instagramDirectService] Could not decode stored credentials');
    return false;
  }

  try {
    logger.info({ tenantId, username: creds.username }, '[instagramDirectService] Attempting auto re-login...');
    const { ig, accountId } = await performFreshLogin(creds.username, creds.password);

    const serializedState = await serializeIgState(ig);
    await instagramDirectRepo.saveSession(tenantId, {
      username: creds.username,
      accountId,
      sessionData: serializedState,
      status: 'connected',
    });

    // Update in-memory client (keep existing poller)
    const existing = activeClients.get(tenantId);
    const poller = existing?.poller;
    activeClients.set(tenantId, {
      ig,
      username: creds.username,
      accountId,
      status: 'connected',
      poller,
    });

    logger.info({ tenantId, username: creds.username }, '[instagramDirectService] Auto re-login successful!');
    return true;
  } catch (err) {
    logger.error({ err: err.message, tenantId }, '[instagramDirectService] Auto re-login failed');
    return false;
  }
}

/**
 * Marks a session as disconnected - stops poller, clears memory, updates DB.
 * This makes the frontend show the login form again.
 */
async function markDisconnected(tenantId) {
  const existing = activeClients.get(tenantId);
  if (existing?.poller) {
    clearTimeout(existing.poller);
  }
  activeClients.delete(tenantId);
  try {
    await instagramDirectRepo.updateStatus(tenantId, 'disconnected');
  } catch (_) {}
  logger.info({ tenantId }, '[instagramDirectService] Session marked disconnected - user must reconnect from Settings');
}

/**
 * Polls Direct Inbox for new unread/incoming customer messages.
 */
async function pollInbox(tenantId) {
  const clientData = activeClients.get(tenantId);
  if (!clientData?.ig || clientData.status !== 'connected') return;

  let ig = clientData.ig;

  // Ensure cookieUserId is set
  if (clientData.accountId && !ig.state.cookieUserId) {
    ig.state.cookieUserId = String(clientData.accountId);
  }

  // 1. Fetch primary direct inbox
  let threads = [];
  try {
    const directInbox = ig.feed.directInbox();
    threads = await directInbox.records();
  } catch (err) {
    const errMsg = String(err.message || '');

    // Only a genuinely expired session justifies logging in again. Reacting to
    // every error with a fresh login - which the previous version did - meant
    // a rate-limited inbox (a 400 or 467, not an auth problem) triggered
    // repeated logins from the same device, which is exactly the pattern that
    // gets an Instagram account throttled harder and eventually checkpointed.
    const isAuthError =
      err instanceof IgLoginRequiredError ||
      errMsg.includes('login_required') ||
      errMsg.includes('401');

    if (!isAuthError) {
      logger.warn({ tenantId, err: errMsg }, '[instagramDirectService] Inbox fetch rejected - backing off, session kept');
      throw err; // Let the poller's backoff handle it
    }

    logger.warn({ tenantId, err: errMsg }, '[instagramDirectService] Session expired - attempting auto re-login');
    const success = await attemptReLogin(tenantId);
    if (success) {
      const newClient = activeClients.get(tenantId);
      if (newClient?.ig) {
        ig = newClient.ig;
        try {
          const directInbox = ig.feed.directInbox();
          threads = await directInbox.records();
        } catch (retryErr) {
          const retryMsg = String(retryErr.message || '');
          if (retryMsg.includes('467')) throw retryErr; // Let backoff handle
          logger.error({ err: retryMsg }, '[instagramDirectService] Inbox fetch failed even after re-login');
          await markDisconnected(tenantId);
          return;
        }
      }
    } else {
      await markDisconnected(tenantId);
      return;
    }
  }

  const myPk = String(ig.state.cookieUserId || clientData.accountId || '');

  // 2. Auto-approve pending DM requests
  try {
    const pendingFeed = ig.feed.directPending();
    const pendingThreads = await pendingFeed.records();
    for (const pThread of pendingThreads) {
      try {
        await ig.directThread.approve(pThread.thread_id);
        logger.info({ tenantId, threadId: pThread.thread_id }, '[instagramDirectService] Approved pending DM request');
      } catch (appErr) {
        logger.debug({ err: appErr.message }, '[instagramDirectService] Could not approve pending thread');
      }
    }
  } catch (_) {
    // Pending check is best-effort
  }

  // 3. Process inbox threads
  for (const thread of threads) {
    const items = thread.items || [];
    if (items.length === 0) continue;

    // Only process the latest item per thread to avoid flooding on first connect
    const item = items[0];
    const msgId = String(item.item_id || item.id || '');
    const senderId = String(item.user_id || item.user_pk || '');

    if (!msgId || !senderId) continue;

    // Don't process our own messages or duplicates
    if ((myPk && senderId === myPk) || processedMessageIds.has(msgId)) {
      continue;
    }

    processedMessageIds.add(msgId);
    if (processedMessageIds.size > 2000) {
      const firstKey = processedMessageIds.values().next().value;
      processedMessageIds.delete(firstKey);
    }

    // Extract text content from any message type
    let text = item.text || '';
    if (!text) {
      if (item.item_type === 'media_share') text = `[Instagram Post Share: ${item.media_share?.caption?.text || ''}]`;
      else if (item.item_type === 'story_share') text = `[Instagram Story Reply: ${item.story_share?.text || ''}]`;
      else if (item.item_type === 'clip') text = '[Instagram Reel Share]';
      else if (item.item_type === 'voice_media') text = '[Instagram Voice Note]';
      else if (item.item_type === 'link') text = `[Link: ${item.link?.text || ''}]`;
      else if (item.item_type === 'media') text = '[Instagram Photo/Video]';
      else text = `[Instagram ${item.item_type || 'Message'}]`;
    }

    const userObj = (thread.users || []).find((u) => String(u.pk) === senderId) || {};
    const senderName = userObj.full_name || userObj.username || `IG_${senderId}`;
    const handle = userObj.username || senderId;

    logger.info({ tenantId, senderName, text: text.substring(0, 100) }, '[instagramDirectService] Inbound DM received');

    // Auto-create Lead in CRM
    try {
      const existing = await leadRepository.getLeadByInstagramSenderId(tenantId, senderId);
      if (!existing) {
        const seq = await leadRepository.nextLeadSeq();
        const leadId = `LD-${seq}`;
        await leadRepository.insertInstagramLead(
          tenantId,
          leadId,
          `${senderName} (@${handle})`,
          senderId,
          `First Instagram DM: "${text.substring(0, 200)}"`,
          senderId
        );
        logger.info({ tenantId, leadId, senderName }, '[instagramDirectService] Auto-created CRM Lead from Instagram DM');
      }
    } catch (e) {
      logger.warn({ err: e.message }, '[instagramDirectService] Lead auto-creation skipped');
    }

    // Save inbound message & broadcast via WebSocket
    const saved = await whatsappRepo.saveMessage(
      tenantId,
      `IG_${handle}`,
      'inbound',
      text,
      `${senderName} (@${handle})`,
      1,
      msgId
    );

    broadcastToTenant(tenantId, {
      type: 'WHATSAPP_MESSAGE_RECEIVED',
      chat: saved.chat,
      message: saved.message,
    });

    // AI auto-reply, on exactly the same terms as WhatsApp.
    //
    // This used to read saved.chat.managed_by and fall back to 'ai' when it
    // was missing - but that column no longer exists on whatsapp_chats, so the
    // fallback fired every time and every Instagram DM got an automated reply
    // regardless of the agency's settings. AI is opt-in per chat, the plan has
    // to allow it, and an escalated chat stays with a human.
    const planAllowsAi = await planService.checkFeatureAccess(tenantId, 'canUseAi');
    const chatAiEnabled = saved.chat?.ai_enabled === true && saved.chat?.needs_human !== true;

    if (planAllowsAi && chatAiEnabled) {
      try {
        broadcastToTenant(tenantId, {
          type: 'WHATSAPP_AI_TYPING',
          chatId: saved.chat.id,
          typing: true,
        });

        const aiReplyResult = await aiService.generateWhatsappReply(
          tenantId,
          { phone: `IG_${handle}`, message: text },
          { onHistoryError: (histErr) => logger.warn({ err: histErr }, 'Error loading history for IG DM') }
        );

        const replyText = (aiReplyResult?.reply || '').trim();

        if (!replyText || replyText.includes('[FALLBACK_HUMAN_NEEDED]')) {
          // Nothing is sent on a handoff. The old code posted a canned "our
          // team will reply shortly" here, which is exactly the reassurance a
          // customer should get from a person, not a bot that just gave up.
          await whatsappWebRepository.flagChatForHuman(saved.chat.id, 'AI escalated: needs a human');
          logger.info({ tenantId, handle }, '[instagramDirectService] AI escalated this Instagram chat to a human');
        } else {
          await ig.entity.directThread(thread.thread_id).broadcastText(replyText);

          const outboundSaved = await whatsappRepo.saveMessage(
            tenantId,
            `IG_${handle}`,
            'outbound',
            replyText,
            `${senderName} (@${handle})`,
            0,
            `out_ig_${Date.now()}`
          );

          broadcastToTenant(tenantId, {
            type: 'WHATSAPP_MESSAGE_RECEIVED',
            chat: outboundSaved.chat,
            message: outboundSaved.message,
          });

          logger.info({ tenantId, handle, replyText: replyText.substring(0, 80) }, '[instagramDirectService] Sent AI Auto-Reply DM');
        }
      } catch (aiErr) {
        logger.error({ err: aiErr.message }, '[instagramDirectService] Failed to process AI auto-reply for Instagram DM');
      } finally {
        broadcastToTenant(tenantId, {
          type: 'WHATSAPP_AI_TYPING',
          chatId: saved.chat.id,
          typing: false,
        });
      }
    }
  }
}

/**
 * Sends a manual DM from human agent in CRM chat.
 */
async function sendManualDm(tenantId, { recipientUsername, threadId, text }) {
  const clientData = activeClients.get(tenantId);
  if (!clientData?.ig || clientData.status !== 'connected') {
    throw new Error('Instagram session is not connected. Please check Instagram Connection in Settings.');
  }

  const ig = clientData.ig;
  if (threadId) {
    await ig.entity.directThread(threadId).broadcastText(text);
  } else if (recipientUsername) {
    const cleanUsername = String(recipientUsername).replace(/^IG_/, '').trim();
    const targetUser = await ig.user.searchExact(cleanUsername);
    const thread = ig.entity.directThread([String(targetUser.pk)]);
    await thread.broadcastText(text);
  } else {
    throw new Error('Recipient username or threadId is required.');
  }
  return { success: true };
}

/**
 * Disconnects & clears Instagram Direct session.
 */
async function disconnectSession(tenantId) {
  const existing = activeClients.get(tenantId);
  if (existing?.poller) {
    clearTimeout(existing.poller);
  }
  activeClients.delete(tenantId);

  await instagramDirectRepo.clearSession(tenantId);
  logger.info({ tenantId }, '[instagramDirectService] Direct Instagram session disconnected.');
  return { status: 'disconnected' };
}

/**
 * Gets connection status. Auto-resumes session if DB has a connected session.
 */
async function getStatus(tenantId) {
  const dbSession = await instagramDirectRepo.getSession(tenantId);
  let active = activeClients.get(tenantId);

  // Auto-resume if DB says connected but no in-memory client
  if (dbSession?.status === 'connected' && !active) {
    // Prefer fresh re-login over stale cookies
    if (dbSession.encrypted_creds) {
      const success = await attemptReLogin(tenantId);
      if (success) {
        active = activeClients.get(tenantId);
      }
    } else if (dbSession.session_data) {
      // Fallback: try cookie restore
      try {
        const ig = new IgApiClient();
        if (dbSession.username) ig.state.generateDevice(dbSession.username);
        await deserializeIgState(ig, dbSession.session_data, dbSession.account_id);
        activeClients.set(tenantId, {
          ig,
          username: dbSession.username,
          accountId: dbSession.account_id,
          status: 'connected',
        });
        startInboxPoller(tenantId);
        active = activeClients.get(tenantId);
        logger.info({ tenantId, username: dbSession.username }, '[instagramDirectService] Auto-resumed IG session from cookies');
      } catch (e) {
        logger.warn({ err: e.message }, '[instagramDirectService] Could not auto-resume session');
      }
    }
  }

  return {
    status: active?.status || dbSession?.status || 'disconnected',
    username: active?.username || dbSession?.username || '',
    accountId: active?.accountId || dbSession?.account_id || '',
    updatedAt: dbSession?.updated_at || null,
  };
}

/**
 * Automatically resumes connected Instagram sessions on server boot.
 */
async function autoResumeConnectedSessions() {
  try {
    const tenantIds = await instagramDirectRepo.listConnectedTenantIds();
    for (const tenantId of tenantIds) {
      try {
        const dbSession = await instagramDirectRepo.getSession(tenantId);
        if (!dbSession) continue;

        // Prefer fresh login over stale cookies
        if (dbSession.encrypted_creds) {
          const success = await attemptReLogin(tenantId);
          if (success) {
            startInboxPoller(tenantId);
            continue;
          }
        }

        // Fallback: cookie restore
        if (dbSession.session_data) {
          const ig = new IgApiClient();
          if (dbSession.username) ig.state.generateDevice(dbSession.username);
          await deserializeIgState(ig, dbSession.session_data, dbSession.account_id);

          activeClients.set(tenantId, {
            ig,
            username: dbSession.username,
            accountId: dbSession.account_id,
            status: 'connected',
          });

          startInboxPoller(tenantId);
          logger.info({ tenantId, username: dbSession.username }, '[instagramDirectService] Resumed Direct Instagram session');
        }
      } catch (err) {
        logger.warn({ tenantId, err: err.message }, '[instagramDirectService] Failed to resume Direct Instagram session');
      }
    }
  } catch (err) {
    logger.error({ err }, '[instagramDirectService] Error in autoResumeConnectedSessions');
  }
}

module.exports = {
  loginWithCredentials,
  submitVerificationCode,
  disconnectSession,
  getStatus,
  sendManualDm,
  autoResumeConnectedSessions,
};
