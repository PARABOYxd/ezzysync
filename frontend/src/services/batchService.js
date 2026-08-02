import api from './api';

export const getBatches = () =>
  api.get('/batches').then((r) => r.data.batches);

export const getBatchById = (id) =>
  api.get(`/batches/${id}`).then((r) => r.data);

export const createBatch = (data) =>
  api.post('/batches', data).then((r) => r.data.batch);

export const updateBatch = (id, data) =>
  api.put(`/batches/${id}`, data).then((r) => r.data.batch);

export const deleteBatch = (id) =>
  api.delete(`/batches/${id}`);

export const linkBooking = (batchId, bookingId) =>
  api.post(`/batches/${batchId}/link`, { bookingId }).then((r) => r.data.booking);

export const unlinkBooking = (batchId, bookingId) =>
  api.post(`/batches/${batchId}/unlink`, { bookingId }).then((r) => r.data.booking);
