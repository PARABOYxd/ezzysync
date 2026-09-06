import api from './api';

export function connectGoogle() {
    const token = localStorage.getItem("hf_token");

    window.location.href =
        `${import.meta.env.VITE_API_URL}/google/auth?token=${token}`;
}

/** Whether Gmail is linked, and to which address. */
export const getGmailStatus = () =>
    api.get('/google/gmail/status').then((r) => r.data);

/** Unlinks Gmail and revokes the token at Google. */
export const disconnectGmail = () =>
    api.post('/google/gmail/disconnect').then((r) => r.data);
