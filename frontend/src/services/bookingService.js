import api from './api';

export const getBookings = (params) => api.get('/bookings', { params }).then((r) => r.data);
export const getBooking = (id) => api.get(`/bookings/${id}`).then((r) => r.data.booking);
export const createBooking = (payload) => api.post('/bookings', payload).then((r) => r.data.booking);
export const updateBooking = (id, payload) => api.put(`/bookings/${id}`, payload).then((r) => r.data.booking);
export const deleteBooking = (id) => api.delete(`/bookings/${id}`).then((r) => r.data);
export const exportBookingsCSV = () =>
  api.get('/bookings/export/csv', { responseType: 'blob' }).then((r) => r.data);

export const parseTicket = (payload, isFile = false) => {
  const headers = isFile ? { 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'application/json' };
  return api.post('/ai/parse', payload, { headers }).then((r) => r.data.result);
};

export const getFollowUps = (bookingId) => api.get(`/bookings/${bookingId}/follow-ups`).then((r) => r.data.followUps);
export const addFollowUp = (bookingId, payload) => api.post(`/bookings/${bookingId}/follow-ups`, payload).then((r) => r.data.followUp);

