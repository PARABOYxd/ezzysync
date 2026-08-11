import api from './api';

/**
 * Fetch all users (team members) for the current tenant.
 * Used by booking form to populate the team member dropdown.
 */
export async function getUsers() {
  const { data } = await api.get('/users');
  return data.users || data || [];
}

export const createUser = (payload) => api.post('/users', payload).then((r) => r.data);
export const updateUser = (id, payload) => api.put(`/users/${id}`, payload).then((r) => r.data);
export const deleteUser = (id) => api.delete(`/users/${id}`).then((r) => r.data);
