import api from './api';

export const listExpenses = (params) => api.get('/expenses', { params }).then((r) => r.data);
export const createExpense = (payload) => api.post('/expenses', payload).then((r) => r.data);
export const updateExpense = (id, payload) => api.put(`/expenses/${id}`, payload).then((r) => r.data);
export const deleteExpense = (id) => api.delete(`/expenses/${id}`).then((r) => r.data);

// Trip Cost Templates
export const listTemplates = () => api.get('/expenses/templates').then((r) => r.data);
export const upsertTemplate = (payload) => api.post('/expenses/templates', payload).then((r) => r.data);
export const deleteTemplate = (id) => api.delete(`/expenses/templates/${id}`).then((r) => r.data);
