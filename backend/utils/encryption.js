const crypto = require("crypto");
const env = require("../config/env");

const ALGORITHM = "aes-256-gcm";

function getKey() {
    const raw = (env.tokenEncryptionKey || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdeg").trim();
    const clean = raw.replace(/^['"]|['"]$/g, "");
    if (clean.length === 64 && /^[0-9a-fA-F]+$/.test(clean)) {
        return Buffer.from(clean, "hex");
    }
    // If not a 64-character hex string (e.g. 32-char hex or passphrase),
    // sha256 hash it to guarantee an exact 32-byte (256-bit) key for aes-256-gcm.
    return crypto.createHash("sha256").update(clean).digest();
}

function encrypt(text) {
    const key = getKey();
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

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
    const key = getKey();
    const [ivHex, tagHex, encrypted] = payload.split(":");

    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        key,
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