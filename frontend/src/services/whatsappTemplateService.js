import api from './api';

export const getTemplates = () =>
  api.get('/whatsapp/templates').then((r) => r.data.templates || []);

export const createTemplate = (payload) =>
  api.post('/whatsapp/templates', payload).then((r) => r.data.template);

export const deleteTemplate = (id) =>
  api.delete(`/whatsapp/templates/${id}`).then((r) => r.data);
