import api from './api';

export const getDashboard = (member = null) => {
  const params = member ? { member } : {};
  return api.get('/dashboard', { params }).then((r) => r.data);
};
export const getBillingAnalytics = (params = {}) => api.get('/dashboard/analytics', { params }).then((r) => r.data);
