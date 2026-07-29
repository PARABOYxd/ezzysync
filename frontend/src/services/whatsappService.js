import api from './api';

export const sendWhatsApp = (bookingId, mediaLink, messageText) =>
  api.post(`/whatsapp/${bookingId}/send`, { mediaLink, messageText }).then((r) => r.data);
