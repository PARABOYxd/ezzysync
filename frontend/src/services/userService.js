import api from './api';

/**
 * Fetch all users (team members) for the current tenant.
 * Used by booking form to populate the team member dropdown.
 */
let usersCache = null;
let usersFetchTime = 0;
const USERS_CACHE_TTL = 120000; // 2 minutes

export async function getUsers(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && usersCache && (now - usersFetchTime < USERS_CACHE_TTL)) {
    return usersCache;
  }
  const { data } = await api.get('/users');
  const result = data.users || data || [];
  usersCache = result;
  usersFetchTime = now;
  return result;
}

export const clearUsersCache = () => {
  usersCache = null;
  usersFetchTime = 0;
};

export const createUser = (payload) => api.post('/users', payload).then((r) => { clearUsersCache(); return r.data; });
export const updateUser = (id, payload) => api.put(`/users/${id}`, payload).then((r) => { clearUsersCache(); return r.data; });
export const deleteUser = (id, reassignToUserId) =>
  api.delete(`/users/${id}`, { params: reassignToUserId ? { reassignTo: reassignToUserId } : {} }).then((r) => { clearUsersCache(); return r.data; });

