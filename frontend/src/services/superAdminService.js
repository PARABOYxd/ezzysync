import api from './api';

export const superAdminService = {
  getStats: () => api.get('/super-admin/stats').then((r) => r.data.stats),
  
  listTenants: (params = {}) => 
    api.get('/super-admin/tenants', { params }).then((r) => r.data),

  getTenantDetails: (id) => 
    api.get(`/super-admin/tenants/${id}`).then((r) => r.data.tenant),

  updateTenantPlan: (id, payload) => 
    api.patch(`/super-admin/tenants/${id}/plan`, payload).then((r) => r.data),

  updateTenantProfile: (id, payload) => 
    api.patch(`/super-admin/tenants/${id}/profile`, payload).then((r) => r.data),

  toggleSuspension: (id, isSuspended) => 
    api.patch(`/super-admin/tenants/${id}/status`, { isSuspended }).then((r) => r.data),

  impersonateTenant: (id) => 
    api.post(`/super-admin/tenants/${id}/impersonate`).then((r) => r.data),

  deleteTenant: (id) => 
    api.delete(`/super-admin/tenants/${id}`).then((r) => r.data),
};
