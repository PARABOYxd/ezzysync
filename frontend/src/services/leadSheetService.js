import api from './api';

/** Connected sheets, plus what the Add Sheet form offers (trips, team, stages). */
export const getLeadSheets = () => api.get('/lead-sheets').then((r) => r.data);

/** Reads a pasted sheet link and answers with its columns and the mapping that would be used. */
export const previewLeadSheet = (sheetUrl) => api.post('/lead-sheets/preview', { sheetUrl }).then((r) => r.data);

export const createLeadSheet = (payload) => api.post('/lead-sheets', payload).then((r) => r.data.sheet);
export const updateLeadSheet = (id, payload) => api.put(`/lead-sheets/${id}`, payload).then((r) => r.data.sheet);
export const setLeadSheetPaused = (id, paused) => api.patch(`/lead-sheets/${id}/paused`, { paused }).then((r) => r.data.sheet);
export const syncLeadSheet = (id) => api.post(`/lead-sheets/${id}/sync`).then((r) => r.data);
export const deleteLeadSheet = (id) => api.delete(`/lead-sheets/${id}`).then((r) => r.data);
