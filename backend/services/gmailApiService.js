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

    oauth2Client.setCredentials({
        refresh_token: decrypt(connection.refreshTokenEncrypted),
    });

    return oauth2Client;
}

module.exports = {
    getAuthenticatedClient,
};