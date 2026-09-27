import axios from 'axios';

export const API_BASE = 'http://localhost:5005/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ezzysync_master_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ezzysync_master_token');
      localStorage.removeItem('ezzysync_master_user');
      window.dispatchEvent(new Event('master-auth-change'));
    }
    return Promise.reject(error);
  }
);

export default api;
