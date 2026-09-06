const fs = require('fs');
const path = require('path');
const { initAuthCreds, BufferJSON, proto } = require('@whiskeysockets/baileys');
const authRepository = require('../repositories/whatsappAuthRepository');
const logger = require('../utils/logger').child({ module: 'whatsapp_auth' });

/**
 * The key types Baileys stores, longest first.
 *
 * Files are named "<type>-<id>.json" and both halves contain hyphens - the
 * type ("app-state-sync-key") and the id, which is a sanitised JID where ':'
 * became '-' ("sender-key-1203...@g.us--3126904025190_1-0"). Splitting on the
 * first hyphen therefore produced categories like "app" and "lid", and the
 * keys were unreadable afterwards even though every file had been copied.
 * Matching the longest known type is the only way to place the boundary.
 */
const KEY_TYPES = [
  'app-state-sync-version',
  'app-state-sync-key',
  'sender-key-memory',
  'identity-key',
  'lid-mapping',
  'device-list',
  'sender-key',
  'pre-key',
  'tctoken',
  'session',
];

const CREDS_CATEGORY = 'creds';
const CREDS_KEY = 'me';

// Key writes are batched over this window. Long enough that a burst of Signal
// key updates becomes one statement, short enough that a crash can only lose
// keys from the last fraction of a second - and Baileys re-derives those on
// the next message anyway. Credentials never wait: they are flushed at once.
const FLUSH_DELAY_MS = 200;

const encode = (value) => JSON.stringify(value, BufferJSON.replacer);
const decode = (text) => JSON.parse(text, BufferJSON.reviver);

const cacheKey = (category, keyId) => `${category}:${keyId}`;

/**
 * Baileys auth state kept in Postgres instead of on the container's disk.
 *
 * `useMultiFileAuthState` writes one file per key under backend/sessions/. On
 * Railway that directory is wiped by every deploy and every restart, so an
 * agency's WhatsApp link died on a schedule they could not predict and had to
 * be re-scanned - while whatsapp_sessions still claimed 'connected', because
 * only the keys were gone.
 *
 * Reads never touch the database. Everything is loaded once here, then served
 * from a Map, which makes this faster than the file store it replaces: that
 * one did a filesystem read for every key lookup during message decryption,
 * and there is one lookup per contact per message.
 *
 * Writes go to the Map immediately and to Postgres on a short timer, coalesced
 * into a single upsert. A failed flush keeps its rows queued and retries on
 * the next tick rather than dropping them.
 */
async function usePostgresAuthState(tenantId) {
  const rows = await authRepository.loadAll(tenantId);

  const cache = new Map();
  for (const row of rows) {
    try {
      cache.set(cacheKey(row.category, row.key_id), decode(row.value));
    } catch (err) {
      // One unreadable row must not take down a whole working session - the
      // key is simply treated as absent and Baileys re-negotiates it.
      logger.warn({ tenantId, category: row.category, err }, 'Skipping unreadable auth row');
    }
  }

  const creds = cache.get(cacheKey(CREDS_CATEGORY, CREDS_KEY)) || initAuthCreds();

  const pendingWrites = new Map(); // cacheKey -> { category, keyId, value }
  const pendingDeletes = new Map(); // cacheKey -> { category, keyId }
  let flushTimer = null;
  let flushing = false;

  async function flush() {
    if (flushing) return;
    if (!pendingWrites.size && !pendingDeletes.size) return;

    flushing = true;
    // Taken before awaiting so writes arriving mid-flush queue for the next
    // round instead of being dropped by the clear below.
    const writes = [...pendingWrites.values()];
    const deletes = [...pendingDeletes.values()];
    pendingWrites.clear();
    pendingDeletes.clear();

    try {
      if (deletes.length) await authRepository.deleteMany(tenantId, deletes);
      if (writes.length) await authRepository.upsertMany(tenantId, writes);
    } catch (err) {
      logger.error({ tenantId, err }, 'Could not persist WhatsApp auth state; will retry');
      // Put them back, but never over a newer value for the same key.
      for (const entry of writes) {
        const k = cacheKey(entry.category, entry.keyId);
        if (!pendingWrites.has(k) && !pendingDeletes.has(k)) pendingWrites.set(k, entry);
      }
      for (const entry of deletes) {
        const k = cacheKey(entry.category, entry.keyId);
        if (!pendingWrites.has(k) && !pendingDeletes.has(k)) pendingDeletes.set(k, entry);
      }
      schedule();
    } finally {
      flushing = false;
    }
  }

  function schedule() {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flush();
    }, FLUSH_DELAY_MS);
    // Never hold the process open just to write a key.
    if (typeof flushTimer.unref === 'function') flushTimer.unref();
  }

  function queueWrite(category, keyId, value) {
    const k = cacheKey(category, keyId);
    cache.set(k, value);
    pendingDeletes.delete(k);
    pendingWrites.set(k, { category, keyId, value: encode(value) });
    schedule();
  }

  function queueDelete(category, keyId) {
    const k = cacheKey(category, keyId);
    cache.delete(k);
    pendingWrites.delete(k);
    pendingDeletes.set(k, { category, keyId });
    schedule();
  }

  const state = {
    creds,
    keys: {
      get: (type, ids) => {
        const result = {};
        for (const id of ids) {
          let value = cache.get(cacheKey(type, id));
          // Baileys hands this one back to protobuf code, which needs the
          // message type rather than the plain object JSON gave us.
          if (type === 'app-state-sync-key' && value) {
            value = proto.Message.AppStateSyncKeyData.fromObject(value);
          }
          if (value !== undefined) result[id] = value;
        }
        return result;
      },
      set: (data) => {
        for (const type of Object.keys(data)) {
          for (const id of Object.keys(data[type])) {
            const value = data[type][id];
            if (value) queueWrite(type, id, value);
            else queueDelete(type, id);
          }
        }
      },
    },
  };

  return {
    state,
    /**
     * Credentials are flushed synchronously rather than batched. They change
     * rarely, and losing the last write means losing the login itself.
     */
    saveCreds: async () => {
      const k = cacheKey(CREDS_CATEGORY, CREDS_KEY);
      cache.set(k, state.creds);
      pendingWrites.delete(k);
      await authRepository.upsertMany(tenantId, [
        { category: CREDS_CATEGORY, keyId: CREDS_KEY, value: encode(state.creds) },
      ]);
    },
    /** Writes anything still queued. Call before dropping a session. */
    flush,
  };
}

/**
 * Moves a session that already exists on disk into Postgres.
 *
 * Without this, shipping the database-backed store would log every currently
 * linked agency out and make them all scan a QR code again - the keys would
 * still be sitting in backend/sessions/, just nowhere this code looks. Runs
 * once per tenant: after the import the database has credentials, so the
 * caller skips it from then on.
 *
 * Returns true when something was imported.
 */
async function importFromDisk(tenantId, sessionPath) {
  if (!fs.existsSync(path.join(sessionPath, 'creds.json'))) return false;

  const entries = [];
  for (const file of fs.readdirSync(sessionPath)) {
    if (!file.endsWith('.json')) continue;

    let parsed;
    try {
      parsed = decode(fs.readFileSync(path.join(sessionPath, file), 'utf8'));
    } catch (err) {
      logger.warn({ tenantId, file, err }, 'Skipping unreadable session file during import');
      continue;
    }

    if (file === 'creds.json') {
      entries.push({ category: CREDS_CATEGORY, keyId: CREDS_KEY, value: encode(parsed) });
      continue;
    }

    const name = file.slice(0, -'.json'.length);
    const type = KEY_TYPES.find((t) => name.startsWith(`${t}-`));

    if (!type) {
      logger.warn({ tenantId, file }, 'Unrecognised session file type; skipping');
      continue;
    }

    entries.push({
      category: type,
      keyId: name.slice(type.length + 1),
      value: encode(parsed),
    });
  }

  if (!entries.length) return false;

  await authRepository.upsertMany(tenantId, entries);
  logger.info({ tenantId, keys: entries.length }, 'Imported WhatsApp session from disk into the database');
  return true;
}

/**
 * Whether the stored pairing is one WhatsApp will actually accept.
 *
 * Reads only the credentials row, not the whole key set.
 */
async function isPaired(tenantId) {
  const raw = await authRepository.loadCreds(tenantId);
  if (!raw) return false;
  try {
    const creds = decode(raw);
    return !!(creds?.me?.id || creds?.registered);
  } catch (err) {
    logger.warn({ tenantId, err }, 'Stored credentials are unreadable; treating as unpaired');
    return false;
  }
}

async function clearAuthState(tenantId) {
  await authRepository.deleteAll(tenantId);
}

module.exports = {
  usePostgresAuthState,
  importFromDisk,
  isPaired,
  clearAuthState,
  hasStoredCreds: authRepository.hasCreds,
};
