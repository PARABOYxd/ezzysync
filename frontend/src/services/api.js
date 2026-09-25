import axios from 'axios';

let rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
if (rawApiUrl && !rawApiUrl.startsWith("http://") && !rawApiUrl.startsWith("https://")) {
  rawApiUrl = `https://${rawApiUrl}`;
}
export const API_BASE_URL = rawApiUrl;

const api = axios.create({ baseURL: API_BASE_URL });

// Attach the JWT to every outgoing request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hf_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function clearAuth() {
  localStorage.removeItem('hf_token');
  localStorage.removeItem('hf_user');
  localStorage.removeItem('hf_refresh_token');
}

function redirectToLogin() {
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

// Public auth endpoints (login/register/refresh itself/etc) 401 on bad
// credentials or a dead refresh token, not an expired session - no point
// trying to silently refresh those, just let the caller handle the error.
function isPublicAuthRoute(url) {
  return !!url && url.startsWith('/auth/') && url !== '/auth/me';
}

// Coalesces concurrent refresh attempts within THIS tab: if several requests
// 401 at the same moment, only the first triggers a real /auth/refresh call
// and the rest await its result. This alone does not help across tabs - each
// tab has its own JS context and its own refreshPromise.
let refreshPromise = null;

// The refresh token is single-use server-side, and every tab shares the same
// one via localStorage. Two tabs refreshing around the same moment is not
// "concurrent requests in one tab" - it is two separate browsers-within-a-
// browser racing to spend the same token, and whichever loses gets rejected
// even though the session is fine. The Web Locks API is the standard fix:
// it serializes a named lock across every tab, so only one tab in the whole
// browser is ever inside the critical section at a time, in every browser
// still receiving updates except old Safari/webviews - runOnce() falls back
// to running immediately there, leaving the in-tab guard above as the only
// protection on those.
function runOnce(name, fn) {
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request(name, fn);
  }
  return fn();
}

function refreshAccessToken() {
  if (!refreshPromise) {
    const tokenAtCallTime = localStorage.getItem('hf_refresh_token');
    refreshPromise = runOnce('hf-token-refresh', async () => {
      // Re-check after acquiring the lock (or immediately, if this browser
      // has no lock support): another tab may have already refreshed while
      // this one was waiting its turn, in which case the work is done and
      // making a second call would just waste the token again.
      const currentRefreshToken = localStorage.getItem('hf_refresh_token');
      if (currentRefreshToken && currentRefreshToken !== tokenAtCallTime) {
        return localStorage.getItem('hf_token');
      }

      if (!currentRefreshToken) throw new Error('No refresh token available');

      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken: currentRefreshToken });
      localStorage.setItem('hf_token', data.token);
      localStorage.setItem('hf_refresh_token', data.refreshToken);
      return data.token;
    })
      .catch((err) => {
        // Belt-and-suspenders for browsers without Web Locks: if the call
        // above still lost a race, one last check for a token some other
        // tab landed in the meantime, before giving up for real.
        const currentRefreshToken = localStorage.getItem('hf_refresh_token');
        const currentToken = localStorage.getItem('hf_token');
        if (currentToken && currentRefreshToken && currentRefreshToken !== tokenAtCallTime) {
          return currentToken;
        }
        throw err;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// On a 401 from a protected endpoint, try one silent token refresh and
// retry the original request. Only clear auth and bounce to login if the
// refresh itself fails (refresh token missing, expired, or revoked).
/**
 * Server errors carry a requestId that matches the log line for that exact
 * request. Folding it into the message here means every screen shows it
 * without each one having to remember - the backend's message ends with
 * "send us the reference below", and until this existed there was no
 * reference below to send.
 */
function attachRequestReference(response) {
  const data = response?.data;
  if (!data) return;

  // In local dev, if error details exist, use them so developer immediately sees what failed
  const isDev = import.meta.env.DEV;
  if (isDev && data.error && typeof data.error === 'string') {
    data.message = data.error;
  }

  if (typeof data.message === 'string' && data.requestId && !data.message.includes(data.requestId)) {
    data.message = `${data.message}\n\nRef: ${data.requestId}`;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const { response, config } = err;
    attachRequestReference(response);

    if (response?.status !== 401 || !config || config._retried || isPublicAuthRoute(config.url)) {
      return Promise.reject(err);
    }

    config._retried = true;
    try {
      const newToken = await refreshAccessToken();
      config.headers.Authorization = `Bearer ${newToken}`;
      return api(config);
    } catch (refreshErr) {
      clearAuth();
      redirectToLogin();
      return Promise.reject(err);
    }
  }
);

export default api;
