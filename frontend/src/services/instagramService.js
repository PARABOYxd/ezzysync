import api from './api';

export const disconnect = () => api.post('/instagram/disconnect').then((r) => r.data);
