import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('hf_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('hf_token');
    if (!token) {
      setLoading(false);
      return;
    }
    authService
      .fetchMe()
      .then((data) => setUser(data.user))
      .catch((err) => {
        const status = err.response?.status;
        if (status === 401 || status === 403) {
          localStorage.removeItem('hf_token');
          localStorage.removeItem('hf_user');
          localStorage.removeItem('hf_refresh_token');
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, refreshToken, user: u } = await authService.login(email, password);
    localStorage.setItem('hf_token', token);
    localStorage.setItem('hf_refresh_token', refreshToken);
    localStorage.setItem('hf_user', JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (payload) => {
    const { token, refreshToken, user: u } = await authService.register(payload);
    localStorage.setItem('hf_token', token);
    localStorage.setItem('hf_refresh_token', refreshToken);
    localStorage.setItem('hf_user', JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    const refreshToken = localStorage.getItem('hf_refresh_token');
    // Best-effort: revoke the refresh token server-side so it can't be
    // silently used again. Never blocks clearing the local session on it.
    if (refreshToken) authService.logout(refreshToken).catch(() => {});
    localStorage.removeItem('hf_token');
    localStorage.removeItem('hf_user');
    localStorage.removeItem('hf_refresh_token');
    setUser(null);
  }, []);

  const loginWithToken = useCallback(async (token, refreshToken) => {
    localStorage.setItem('hf_token', token);
    if (refreshToken) localStorage.setItem('hf_refresh_token', refreshToken);
    try {
      const data = await authService.fetchMe();
      localStorage.setItem('hf_user', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } catch (err) {
      localStorage.removeItem('hf_token');
      localStorage.removeItem('hf_user');
      localStorage.removeItem('hf_refresh_token');
      setUser(null);
      throw err;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, loginWithToken, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
