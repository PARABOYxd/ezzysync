import api from './api';

export const getQuotations = (params) => api.get('/quotations', { params }).then((r) => r.data);
export const getQuotation = (id) => api.get(`/quotations/${id}`).then((r) => r.data.quotation);
export const getQuotationPublic = (uuid) => api.get(`/quotations/public/${uuid}`).then((r) => r.data);
export const createQuotation = (payload) => api.post('/quotations', payload).then((r) => r.data.quotation);
export const updateQuotation = (id, payload) => api.put(`/quotations/${id}`, payload).then((r) => r.data.quotation);
export const deleteQuotation = (id) => api.delete(`/quotations/${id}`).then((r) => r.data);
export const acceptQuotation = (id) => api.post(`/quotations/${id}/accept`).then((r) => r.data);
export const acceptQuotationPublic = (id, tenantId) => api.post(`/quotations/${id}/accept-public`, { tenantId }).then((r) => r.data);
