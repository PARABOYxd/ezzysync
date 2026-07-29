import api from './api';

/**
 * Fetch all users (team members) for the current tenant.
 * Used by booking form to populate the team member dropdown.
 */
export async function getUsers() {
  const { data } = await api.get('/users');
  return data.users || data || [];
}
