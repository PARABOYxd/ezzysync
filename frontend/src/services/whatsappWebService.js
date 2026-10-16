import api from './api';

export const whatsappWebService = {
  getStatus: async () => {
    const res = await api.get('/whatsapp-web/status');
    return res.data;
  },

  /** Both channels, what a reply will actually use, and the AI's remit. */
  getConnectionOverview: async () => {
    const res = await api.get('/whatsapp-web/overview');
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

  /** Applies an AI on/off decision to every existing chat - the tenant
   * default only governs chats created after it is set. */
  setAiForAllChats: async (enabled) => {
    const res = await api.post('/whatsapp-web/ai-all-chats', { enabled });
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

  /** Newest page of a thread, or the page before message `before`. */
  getChatMessages: async (chatId, { limit, before } = {}) => {
    const params = {};
    if (limit) params.limit = limit;
    if (before) params.before = before;
    const res = await api.get(`/whatsapp-web/chats/${chatId}/messages`, { params });
    return res.data;
  },

  createLeadFromChat: async (chatId) => {
    const res = await api.post(`/whatsapp-web/chats/${chatId}/create-lead`);
    return res.data;
  },

  // `files` accepts a single File or an array - the backend takes up to 8.
  sendMessage: async (chatId, messageText, files = null) => {
    const list = files ? (Array.isArray(files) ? files : [files]) : [];

    if (list.length) {
      const formData = new FormData();
      list.forEach((f) => formData.append('files', f));
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

  listQuickReplies: async () => {
    const res = await api.get('/whatsapp-web/quick-replies');
    return res.data;
  },

  sendItineraryPdf: async (chatId, tripName, itineraryText) => {
    const res = await api.post('/whatsapp-web/send-itinerary-pdf', { chatId, tripName, itineraryText });
    return res.data;
  },

  startChat: async (phone, message = '') => {
    const res = await api.post('/whatsapp-web/start-chat', { phone, message });
    return res.data;
  },

  /** Ready-made messages, for a chat whose 24-hour window has closed. */
  listTemplates: async () => {
    const res = await api.get('/whatsapp-web/templates');
    return res.data;
  },

  sendTemplate: async (chatId, templateId) => {
    const res = await api.post(`/whatsapp-web/chats/${chatId}/send-template`, { templateId });
    return res.data;
  },

  assignChat: async (chatId, assignedTo) => {
    const res = await api.patch(`/whatsapp-web/chats/${chatId}/assign`, { assignedTo });
    return res.data;
  },

  addChatFollowUp: async (chatId, payload) => {
    const res = await api.post(`/whatsapp-web/chats/${chatId}/follow-ups`, payload);
    return res.data;
  },

  getChatFollowUps: async (chatId) => {
    const res = await api.get(`/whatsapp-web/chats/${chatId}/follow-ups`);
    return res.data;
  },
};
