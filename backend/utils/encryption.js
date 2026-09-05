const crypto = require("crypto");
const env = require("../config/env");

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32; // aes-256

/**
 * Reads TOKEN_ENCRYPTION_KEY into a key buffer, and says so plainly when it
 * cannot.
 *
 * This used to be a bare Buffer.from(env.tokenEncryptionKey, "hex") at module
 * load. With the variable unset that throws "The first argument must be of
 * type string ... Received undefined", which takes every controller that
 * imports this file down with it - the server simply fails to boot, and the
 * error names neither the variable nor the file. A short or non-hex key was
 * worse: it loaded fine and failed later, inside a request.
 */
function loadKey() {
  const raw = env.tokenEncryptionKey;

  if (!raw) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY is not set. It encrypts stored Google and Instagram ' +
        'credentials, and the server cannot start without it. Generate one with: ' +
        "node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }

  if (!/^[0-9a-fA-F]+$/.test(raw)) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be hexadecimal characters only.');
  }

  const key = Buffer.from(raw, 'hex');
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY must be ${KEY_BYTES} bytes (${KEY_BYTES * 2} hex characters); ` +
        `this one is ${key.length}. Anything else is rejected by aes-256-gcm at encrypt time.`
    );
  }

  return key;
}

const KEY = loadKey();

function encrypt(text) {
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    return [
        iv.toString("hex"),
        authTag.toString("hex"),
        encrypted,
    ].join(":");
}

function decrypt(payload) {
    const [ivHex, tagHex, encrypted] = payload.split(":");

    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        KEY,
        Buffer.from(ivHex, "hex")
    );

    decipher.setAuthTag(Buffer.from(tagHex, "hex"));

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
}

module.exports = {
    encrypt,
    decrypt,
};