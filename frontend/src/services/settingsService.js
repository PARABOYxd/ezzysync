import api from './api';

export const getSettings = () => api.get('/settings').then((r) => r.data.settings);
export const updateSettings = (payload) => api.put('/settings', payload).then((r) => r.data.settings);

export const getPublicLeadKey = () => api.get('/settings/lead-capture-key').then((r) => r.data.publicLeadKey);
export const regeneratePublicLeadKey = () => api.post('/settings/lead-capture-key/regenerate').then((r) => r.data.publicLeadKey);
