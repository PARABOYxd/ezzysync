import api from './api';

export const whatsappWebService = {
  getStatus: async () => {
    const res = await api.get('/whatsapp-web/status');
    return res.data;
  },

  connect: async () => {
    const res = await api.post('/whatsapp-web/connect');
    return res.data;
  },

  disconnect: async () => {
    const res = await api.post('/whatsapp-web/disconnect');
    return res.data;
  },

  toggleAiAutopilot: async (enabled) => {
    const res = await api.post('/whatsapp-web/toggle-autopilot', { enabled });
    return res.data;
  },

  listChats: async (search = '') => {
    const res = await api.get(`/whatsapp-web/chats${search ? `?search=${encodeURIComponent(search)}` : ''}`);
    return res.data;
  },

  getChatMessages: async (chatId) => {
    const res = await api.get(`/whatsapp-web/chats/${chatId}/messages`);
    return res.data;
  },

  sendMessage: async (chatId, messageText, file = null) => {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      if (messageText) formData.append('messageText', messageText);
      const res = await api.post(`/whatsapp-web/chats/${chatId}/send`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    }
    const res = await api.post(`/whatsapp-web/chats/${chatId}/send`, { messageText });
    return res.data;
  },

  toggleChatAi: async (chatId, enabled) => {
    const res = await api.post(`/whatsapp-web/chats/${chatId}/toggle-ai`, { enabled });
    return res.data;
  },

  aiSuggest: async (chatId, { mode = 'suggest', draft = '' } = {}) => {
    const res = await api.post(`/whatsapp-web/chats/${chatId}/ai-suggest`, { mode, draft });
    return res.data;
  },

  sendItineraryPdf: async (chatId, tripName, itineraryText) => {
    const res = await api.post('/whatsapp-web/send-itinerary-pdf', { chatId, tripName, itineraryText });
    return res.data;
  },
};
