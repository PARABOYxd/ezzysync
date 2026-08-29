import api from './api';

export const getChats = () => api.get('/whatsapp/chats').then((r) => r.data.chats || []);

export const getChatMessages = (chatId) =>
  api.get(`/whatsapp/chats/${chatId}/messages`).then((r) => r.data.messages || []);

export const sendChatMessage = (chatId, payload) => {
  const body = typeof payload === 'string' ? { text: payload } : payload;
  return api.post(`/whatsapp/chats/${chatId}/send`, body).then((r) => r.data);
};

export const markChatAsRead = (chatId) =>
  api.post(`/whatsapp/chats/${chatId}/read`).then((r) => r.data.chat);

export const updateChatManagement = (chatId, managedBy) =>
  api.put(`/whatsapp/chats/${chatId}/management`, { managedBy }).then((r) => r.data);
