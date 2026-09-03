import api from './api';

export const getInstagramDirectStatus = () => api.get('/instagram-direct/status').then((r) => r.data);

export const loginInstagramDirect = (username, password) =>
  api.post('/instagram-direct/login', { username, password }).then((r) => r.data);

export const verifyInstagramDirectCode = (code) =>
  api.post('/instagram-direct/verify', { code }).then((r) => r.data);

export const disconnectInstagramDirect = () =>
  api.post('/instagram-direct/disconnect').then((r) => r.data);
