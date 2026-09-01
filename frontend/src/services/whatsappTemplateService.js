import api from './api';

export const getTemplates = () =>
  api.get('/whatsapp/templates').then((r) => r.data.templates || []);

export const lookupTemplate = (name) =>
  api.get(`/whatsapp/templates/lookup?name=${encodeURIComponent(name)}`).then((r) => r.data);

export const createTemplate = (payload) =>
  api.post('/whatsapp/templates', payload).then((r) => r.data.template);

export const syncTemplates = () =>
  api.post('/whatsapp/templates/sync').then((r) => r.data);

export const deleteTemplate = (id) =>
  api.delete(`/whatsapp/templates/${id}`).then((r) => r.data);
