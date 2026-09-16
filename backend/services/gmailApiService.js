const { google } = require("googleapis");

const oauth2Client = require("../config/googleOAuth");
const env = require("../config/env");

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

/**
 * Trades an OAuth callback code for the tenant's Gmail refresh token and
 * profile email - the "connect Gmail to send invoices from" flow. Moved out
 * of googleController verbatim; the caller still owns encrypting the
 * refresh token before storing it (encryption is a general utility, not a
 * Gmail-specific concern) and the tenantId/state handling around it.
 */
async function exchangeGmailConnectionCode(code) {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();

    if (!tokens.refresh_token) {
        throw new Error(
            "Google did not return a refresh token. Please disconnect the app from your Google Account and reconnect."
        );
    }

    return { googleEmail: profile.email, refreshToken: tokens.refresh_token };
}

/**
 * A separate, narrower-scoped OAuth2 client for "Sign in with Google" on the
 * login page - different redirect URI and scopes (no gmail.send) than the
 * Gmail-connection flow above, so it is not the same client instance.
 */
function getLoginOAuth2Client(redirectUri) {
    return new google.auth.OAuth2(
        env.google.clientId,
        env.google.clientSecret,
        redirectUri || env.google.loginRedirectUri
    );
}

const LOGIN_SCOPES = ["openid", "email", "profile"];

function buildLoginAuthUrl(redirectUri) {
    return getLoginOAuth2Client(redirectUri).generateAuthUrl({
        access_type: "online",
        scope: LOGIN_SCOPES,
        prompt: "select_account",
    });
}

/** Trades a "Sign in with Google" callback code for the signer's profile. */
async function exchangeLoginAuthCode(code, redirectUri) {
    const client = getLoginOAuth2Client(redirectUri);
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const { data: profile } = await oauth2.userinfo.get();

    if (!profile.id || !profile.email) {
        throw new Error("Google did not return essential profile information.");
    }

    return { googleId: profile.id, email: profile.email, name: profile.name || profile.email.split("@")[0] };
}

module.exports = {
    getAuthenticatedClient,
    exchangeGmailConnectionCode,
    buildLoginAuthUrl,
    exchangeLoginAuthCode,
};