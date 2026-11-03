const oauth2Client = require("../config/googleOAuth");
const gmailApiService = require("../services/gmailApiService");
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

        const { googleEmail, refreshToken } = await gmailApiService.exchangeGmailConnectionCode(code);
        const encryptedRefreshToken = encrypt(refreshToken);

        req.log.info({ tenantId, googleEmail }, 'Google account connected');
        await gmailConnectionService.upsertConnection({
            tenantId,
            googleEmail,
            refreshTokenEncrypted: encryptedRefreshToken,
        });

        const frontendUrl = env.frontendUrl || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/settings?gmail=connected`);
    } catch (err) {
        req.log.error({ err }, 'Google Gmail connection callback failed');

        const frontendUrl = env.frontendUrl || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/settings?gmail=error`);
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
