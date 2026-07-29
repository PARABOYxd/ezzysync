const { google } = require("googleapis");
const oauth2Client = require("../config/googleOAuth");
const gmailConnectionService = require("./gmailConnectionService");
const { decrypt } = require("../utils/encryption");

async function getAuthenticatedClient(tenantId) {
    const connection =
        await gmailConnectionService.getConnectionByTenant(tenantId);

    if (!connection) {
        throw new Error("Google account not connected.");
    }

    const refreshToken = decrypt(connection.refreshTokenEncrypted);

    oauth2Client.setCredentials({
        refresh_token: refreshToken,
    });

    await oauth2Client.getAccessToken();

    return {
        gmail: google.gmail({
            version: "v1",
            auth: oauth2Client,
        }),
        googleEmail: connection.googleEmail,
    };
}

function buildMimeMessage({
                              from,
                              to,
                              subject,
                              html,
                              attachments = [],
                          }) {
    const boundary = "hf_boundary";

    let message = [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        "MIME-Version: 1.0",
        `Content-Type: multipart/mixed; boundary=${boundary}`,
        "",
        `--${boundary}`,
        "Content-Type: text/html; charset=UTF-8",
        "",
        html,
    ];

    for (const file of attachments) {
        message.push(
            `--${boundary}`,
            `Content-Type: ${file.contentType}`,
            "Content-Transfer-Encoding: base64",
            `Content-Disposition: attachment; filename="${file.filename}"`,
            "",
            file.content.toString("base64")
        );
    }

    message.push(`--${boundary}--`);

    return Buffer.from(message.join("\n"))
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

async function sendEmail({
                             tenantId,
                             to,
                             subject,
                             html,
                             attachments = [],
                         }) {

    const { gmail, googleEmail } =
        await getAuthenticatedClient(tenantId);

    const raw = buildMimeMessage({
        from: googleEmail,
        to,
        subject,
        html,
        attachments,
    });

    await gmail.users.messages.send({
        userId: "me",
        requestBody: {
            raw,
        },
    });
}

module.exports = {
    sendEmail,
};