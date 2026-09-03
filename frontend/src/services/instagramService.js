import api from './api';

export const connectInstagram = () => {
  const token = localStorage.getItem('hf_token');
  const backendUrl = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
    : 'http://localhost:5001';
  const authUrl = `${backendUrl}/api/instagram/auth?token=${token}`;
  const width = 600;
  const height = 720;
  const left = Math.max(0, (window.screen.width - width) / 2);
  const top = Math.max(0, (window.screen.height - height) / 2);
  window.open(authUrl, 'Instagram OAuth', `width=${width},height=${height},top=${top},left=${left}`);
};

export const disconnect = () => api.post('/instagram/disconnect').then((r) => r.data);
