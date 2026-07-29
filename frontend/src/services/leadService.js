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
