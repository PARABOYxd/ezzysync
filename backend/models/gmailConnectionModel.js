function rowToGmailConnection(row) {
    if (!row) return null;

    return {
        tenantId: row.tenant_id,
        googleEmail: row.google_email,
        refreshTokenEncrypted: row.refresh_token_encrypted,
        connected: row.connected,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastSyncAt: row.last_sync_at,
    };
}

function gmailConnectionToRow(connection) {
    return {
        tenant_id: connection.tenantId,
        google_email: connection.googleEmail,
        refresh_token_encrypted: connection.refreshTokenEncrypted,
        connected: connection.connected,
        last_sync_at: connection.lastSyncAt,
    };
}

module.exports = {
    rowToGmailConnection,
    gmailConnectionToRow,
};