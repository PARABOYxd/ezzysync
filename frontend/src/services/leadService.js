import api from './api';

export const getLeads = (params) => api.get('/leads', { params }).then((r) => r.data);
export const getLeadsForPipeline = () => api.get('/leads/pipeline').then((r) => r.data.leads);
export const getLead = (id) => api.get(`/leads/${id}`).then((r) => r.data.lead);
export const createLead = (payload) => api.post('/leads', payload).then((r) => r.data.lead);
export const updateLead = (id, payload) => api.put(`/leads/${id}`, payload).then((r) => r.data.lead);
export const updateLeadStage = (id, stage) => api.patch(`/leads/${id}/stage`, { stage }).then((r) => r.data.lead);
export const deleteLead = (id) => api.delete(`/leads/${id}`).then((r) => r.data);
export const convertLeadToBooking = (id, payload) => api.post(`/leads/${id}/convert`, payload).then((r) => r.data);

export const getLeadFollowUps = (id) => api.get(`/leads/${id}/follow-ups`).then((r) => r.data.followUps);
export const addLeadFollowUp = (id, payload) => api.post(`/leads/${id}/follow-ups`, payload).then((r) => r.data.followUp);

/** Unassigned leads available for anyone on the team to claim. */
export const getLeadPool = () => api.get('/leads/pool').then((r) => r.data.leads || []);
export const claimLead = (id) => api.post(`/leads/${id}/claim`).then((r) => r.data);

export const bulkImportLeads = (rows) => api.post('/leads/bulk-import', { rows }).then((r) => r.data);
export const broadcastToLeads = (leadIds, templateId) =>
  api.post('/leads/broadcast', { leadIds, templateId }).then((r) => r.data);

export const getBroadcastHistory = () => api.get('/leads/broadcasts').then((r) => r.data.broadcasts || []);
export const getBroadcastDetail = (broadcastId) => api.get(`/leads/broadcasts/${broadcastId}`).then((r) => r.data);
export const getBroadcastQuota = () => api.get('/leads/broadcast-quota').then((r) => r.data);

/* ------------------------------------------------ importing an old sheet */

/** The importable fields with their example values - shown before any file is chosen. */
export const getLeadImportFields = () => api.get('/leads/import/fields').then((r) => r.data);

/** Uploads the spreadsheet and gets back its columns, a suggested mapping and the parsed rows. */
export const previewLeadImport = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api
    .post('/leads/import/preview', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data);
};

/** Dry run of a mapping: how many rows would import, duplicate or fail. */
export const analyzeLeadImport = (payload) => api.post('/leads/import/analyze', payload).then((r) => r.data);

export const runLeadImport = (payload) => api.post('/leads/import', payload).then((r) => r.data);

/** Downloads the starter workbook for an agency with nothing to import yet. */
export const downloadLeadImportTemplate = async () => {
  const { data } = await api.get('/leads/import/template', { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ezzysync-leads-template.xlsx';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
