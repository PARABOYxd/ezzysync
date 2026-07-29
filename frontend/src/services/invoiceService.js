import api from './api';

export const downloadInvoice = (bookingId) =>
  api.get(`/invoices/${bookingId}/download`, { responseType: 'blob' }).then((r) => r.data);
export const emailInvoice = (bookingId) => api.post(`/invoices/${bookingId}/email`).then((r) => r.data);
