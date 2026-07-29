const { google } = require("googleapis");
const env = require("./env");

const oauth2Client = new google.auth.OAuth2(
    env.google.clientId,
    env.google.clientSecret,
    env.google.redirectUri
);

module.exports = oauth2Client;