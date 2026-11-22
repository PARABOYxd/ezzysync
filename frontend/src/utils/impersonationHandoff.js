import axios from 'axios';
import { API_BASE_URL } from '../services/api.js';

/**
 * Opens an agency session handed over by the admin panel:
 *   /login#impersonateToken=<jwt>
 *
 * Runs before React renders, so the token is out of the address bar before
 * analytics or the auth provider can see it. Only tokens carrying an
 * impersonatedBy claim that the API accepts are used; otherwise any user
 * could send someone a link that silently signs them into the sender's account.
 */
export default async function consumeImpersonationHandoff() {
  const { pathname, search, hash } = window.location;
  if (pathname !== '/login') return;

  const token = new URLSearchParams(hash.slice(1)).get('impersonateToken');
  // Links from older admin builds carried tokens in the query: scrub, never use.
  if (!token && !new URLSearchParams(search).has('impersonateToken')) return;
  window.history.replaceState(null, '', '/login');
  if (!token) return;

  try {
    const claims = JSON.parse(window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!claims.impersonatedBy) return;

    // Not the shared api client: it would swap in this browser's current token.
    const { data } = await axios.get(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000,
    });

    // Keep the original session when switching from one agency to another.
    if (!localStorage.getItem('hf_impersonator')) {
      const user = localStorage.getItem('hf_user');
      localStorage.setItem('hf_impersonator', JSON.stringify({
        external: true,
        token: localStorage.getItem('hf_token'),
        refreshToken: localStorage.getItem('hf_refresh_token'),
        user: user ? JSON.parse(user) : null,
      }));
    }

    localStorage.setItem('hf_token', token);
    localStorage.setItem('hf_user', JSON.stringify(data.user));
    // Must go, or a 401 would silently refresh into the previous account.
    localStorage.removeItem('hf_refresh_token');
    window.history.replaceState(null, '', '/dashboard');
  } catch {
    window.alert('Could not open the agency account. The link may have expired - try again from the admin panel.');
  }
}
