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

// Coalesces concurrent refresh attempts: if several requests 401 at the
// same moment (e.g. a page firing off multiple API calls at once), only
// the first triggers a real /auth/refresh call - the rest await its result
// instead of each racing to rotate the same refresh token.
let refreshPromise = null;

function refreshAccessToken() {
  if (!refreshPromise) {
    const storedRefreshToken = localStorage.getItem('hf_refresh_token');
    refreshPromise = (storedRefreshToken
      ? axios.post(`${baseURL}/auth/refresh`, { refreshToken: storedRefreshToken })
      : Promise.reject(new Error('No refresh token available')))
      .then(({ data }) => {
        localStorage.setItem('hf_token', data.token);
        localStorage.setItem('hf_refresh_token', data.refreshToken);
        return data.token;
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
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const { response, config } = err;
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
