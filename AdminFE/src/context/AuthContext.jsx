import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('ezzysync_master_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('ezzysync_master_token'));
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    try {
      if (!localStorage.getItem('ezzysync_master_token')) {
        setLoading(false);
        return;
      }
      const res = await api.get('/auth/me');
      setUser(res.data.user);
      localStorage.setItem('ezzysync_master_user', JSON.stringify(res.data.user));
    } catch (e) {
      setUser(null);
      localStorage.removeItem('ezzysync_master_token');
      localStorage.removeItem('ezzysync_master_user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
    const handleAuthChange = () => {
      setToken(localStorage.getItem('ezzysync_master_token'));
      setUser(null);
    };
    window.addEventListener('master-auth-change', handleAuthChange);
    return () => window.removeEventListener('master-auth-change', handleAuthChange);
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem('ezzysync_master_token', t);
    localStorage.setItem('ezzysync_master_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
    return u;
  };

  const logout = () => {
    localStorage.removeItem('ezzysync_master_token');
    localStorage.removeItem('ezzysync_master_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
