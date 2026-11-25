const crypto = require("crypto");
const env = require("../config/env");

const ALGORITHM = "aes-256-gcm";

function getKey() {
    if (!env.tokenEncryptionKey) {
        throw new Error(
            "Missing TOKEN_ENCRYPTION_KEY environment variable. " +
            "Please configure a 64-character hex key (32 bytes) in your environment variables."
        );
    }
    return Buffer.from(env.tokenEncryptionKey, "hex");
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
