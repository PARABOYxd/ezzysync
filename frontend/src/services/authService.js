import api from './api';

export const login = (email, password) => api.post('/auth/login', { email, password }).then((r) => r.data);
export const register = (payload) => api.post('/auth/register', payload).then((r) => r.data);
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email }).then((r) => r.data);
export const resetPassword = (payload) => api.post('/auth/reset-password', payload).then((r) => r.data);
export const fetchMe = () => api.get('/auth/me').then((r) => r.data);
