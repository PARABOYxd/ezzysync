import api from './api';

// Ticket/chat parsing (/ai/parse) lives in bookingService.parseTicket, since
// its only consumer is the booking form's autofill flow.

export const generateItinerary = (payload) => api.post('/ai/generate-itinerary', payload).then((r) => r.data);

/** Resolves the raw PDF blob so the caller can drive the browser download. */
export const downloadItinerary = (payload) =>
  api.post('/ai/download-itinerary', payload, { responseType: 'blob' }).then((r) => r.data);

export const whatsappReply = (payload) => api.post('/ai/whatsapp-reply', payload).then((r) => r.data);
