import api from './api';

export const getCustomers = (params) => api.get('/customers', { params }).then((r) => r.data);
export const getCustomer = (id) => api.get(`/customers/${id}`).then((r) => r.data.customer);
