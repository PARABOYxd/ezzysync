const crypto = require("crypto");
const env = require("../config/env");

const ALGORITHM = "aes-256-gcm";

// 32-byte key from hex string
const KEY = Buffer.from(env.tokenEncryptionKey, "hex");

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