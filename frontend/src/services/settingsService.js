import api from './api';

export const getSettings = () => api.get('/settings').then((r) => r.data.settings);
export const updateSettings = (payload) => api.put('/settings', payload).then((r) => r.data.settings);

export const getPublicLeadKey = () => api.get('/settings/lead-capture-key').then((r) => r.data.publicLeadKey);
export const regeneratePublicLeadKey = () => api.post('/settings/lead-capture-key/regenerate').then((r) => r.data.publicLeadKey);

export const requestWhatsappSetup = (payload) =>
  api.post('/settings/whatsapp-request', payload).then((r) => r.data);

export const connectWhatsappEmbedded = (payload) =>
  api.post('/settings/whatsapp/embedded-signup', payload).then((r) => r.data);

export const disconnectWhatsapp = () =>
  api.post('/settings/whatsapp/disconnect').then((r) => r.data);
