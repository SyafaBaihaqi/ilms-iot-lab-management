import React, { createContext, useContext, useEffect, useState } from 'react';
import { request } from '../services/api';

export interface AuthUser {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role: 'Admin' | 'User';
  phone?: string;
  photoUrl?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem('ilms_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleLogout = () => setUser(null);
    window.addEventListener('ilms:logout', handleLogout);
    return () => window.removeEventListener('ilms:logout', handleLogout);
  }, []);

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      const res = await request<any>('POST', '/auth/login', { username, password });
      localStorage.setItem('ilms_access_token', res.data.accessToken);
      localStorage.setItem('ilms_refresh_token', res.data.refreshToken);
      localStorage.setItem('ilms_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('ilms_access_token');
    localStorage.removeItem('ilms_refresh_token');
    localStorage.removeItem('ilms_user');
    setUser(null);
  };

  const refreshProfile = async () => {
    try {
      const res = await request<any>('GET', '/auth/me');
      const merged = { ...user, ...res.data };
      localStorage.setItem('ilms_user', JSON.stringify(merged));
      setUser(merged);
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};