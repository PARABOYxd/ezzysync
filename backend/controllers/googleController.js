const { google } = require("googleapis");
const oauth2Client = require("../config/googleOAuth");
const gmailConnectionService = require("../services/gmailConnectionService");
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { encrypt } = require("../utils/encryption");
const SCOPES = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/gmail.send",
];

exports.googleAuth = (req, res) => {
    const token = req.query.token;

    if (!token) {
        return res.status(401).json({
            message: "Authentication required",
        });
    }

    let payload;

    try {
        payload = jwt.verify(token, env.jwtSecret);
    } catch {
        return res.status(401).json({
            message: "Invalid session",
        });
    }

    const state = jwt.sign(
        {
            tenantId: payload.tenantId,
        },
        env.jwtSecret,
        {
            expiresIn: "10m",
        }
    );

    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: SCOPES,
        state,
    });

    res.redirect(url);
};

exports.googleCallback = async (req, res) => {
    try {

        const { code, state } = req.query;
        const payload = jwt.verify(state, env.jwtSecret);
        const tenantId = payload.tenantId;

        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const { google } = require("googleapis");

        const oauth2 = google.oauth2({
            version: "v2",
            auth: oauth2Client,
        });

        const profile = await oauth2.userinfo.get();
        const googleEmail = profile.data.email;
        if (!tokens.refresh_token) {
            throw new Error(
                "Google did not return a refresh token. Please disconnect the app from your Google Account and reconnect."
            );
        }
        const encryptedRefreshToken = encrypt(tokens.refresh_token);

        req.log.info({ tenantId, googleEmail: profile.data.email }, 'Google account connected');
        await gmailConnectionService.upsertConnection({
            tenantId,
            googleEmail,
            refreshTokenEncrypted: encryptedRefreshToken,
        });

        res.json({
            success: true,
            message: "Google account connected successfully.",
            googleEmail,
        });
    } catch (err) {
        req.log.error({ err }, 'Google Gmail connection callback failed');

        // Already logged above with full detail; the browser gets something
        // a person can act on instead of the raw Google/OAuth error.
        res.status(500).json({
            message: 'Could not finish connecting Gmail. Please try again from Settings.',
        });
    }
};
/**
 * Whether this tenant has Gmail linked, and to which address.
 *
 * Settings previously showed a "Connect Gmail" button and nothing else, so a
 * tenant could not tell whether they were connected, or which of their
 * accounts had been used - and after connecting, the button still said
 * "Connect Gmail".
 */
exports.gmailStatus = async (req, res, next) => {
    try {
        const connection = await gmailConnectionService.getConnectionByTenant(req.user.tenantId);
        res.json({
            connected: Boolean(connection),
            googleEmail: connection?.googleEmail || null,
            connectedAt: connection?.createdAt || null,
        });
    } catch (err) {
        next(err);
    }
};

exports.disconnectGmail = async (req, res, next) => {
    try {
        const result = await gmailConnectionService.disconnect(req.user.tenantId);
        res.json({
            message: result.googleEmail
                ? `Disconnected ${result.googleEmail}. Invoices will now be sent from EzzySync instead.`
                : 'Gmail was not connected.',
            connected: false,
        });
    } catch (err) {
        next(err);
    }
};
