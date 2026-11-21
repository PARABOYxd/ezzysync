import api from './api';

/** Pages the agent can receive lead ads from, the webhook address, and the form's dropdown options. */
export const getMetaLeads = () => api.get('/meta-leads').then((r) => r.data);

/** Opens the Facebook sign-in popup. The page posts `metaLeadsOAuth` back to the opener when done. */
export const openFacebookSignIn = () => {
  const token = localStorage.getItem('hf_token');
  const backendUrl = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
    : 'http://localhost:5001';
  const width = 600;
  const height = 720;
  const left = Math.max(0, (window.screen.width - width) / 2);
  const top = Math.max(0, (window.screen.height - height) / 2);
  window.open(
    `${backendUrl}/api/meta-leads/auth?token=${encodeURIComponent(token)}`,
    'Meta Lead Ads',
    `width=${width},height=${height},top=${top},left=${left}`
  );
};

export const connectMetaPage = (id, payload) => api.post(`/meta-leads/pages/${id}/connect`, payload).then((r) => r.data.page);
export const disconnectMetaPage = (id) => api.post(`/meta-leads/pages/${id}/disconnect`).then((r) => r.data.page);
export const setMetaPagePaused = (id, paused) => api.patch(`/meta-leads/pages/${id}/paused`, { paused }).then((r) => r.data.page);
export const removeMetaPage = (id) => api.delete(`/meta-leads/pages/${id}`).then((r) => r.data);
