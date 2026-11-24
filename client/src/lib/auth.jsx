import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { get, post } from './api.js';

const AuthContext = createContext(null);

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  hse_manager: 'HSE Manager',
  safety_officer: 'Safety Officer',
  safety_supervisor: 'Safety Supervisor',
  site_engineer: 'Site Engineer',
  contractor: 'Contractor',
  employee: 'General Employee'
};

export const ADMIN_ROLES = ['super_admin', 'admin'];

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await get('/api/session');
      setSession(data);
      return data;
    } catch {
      setSession({ user: null, ai: { enabled: false }, demo_data: false });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (email, password) => {
      const data = await post('/api/auth/login', { email, password });
      await refresh();
      return data;
    },
    [refresh]
  );

  const register = useCallback(
    async (payload) => {
      const data = await post('/api/auth/register', payload);
      await refresh();
      return data;
    },
    [refresh]
  );

  const setup = useCallback(
    async (payload) => {
      const data = await post('/api/auth/setup', payload);
      await refresh();
      return data;
    },
    [refresh]
  );

  const logout = useCallback(async () => {
    try {
      await post('/api/auth/logout');
    } finally {
      await refresh();
    }
  }, [refresh]);

  const value = useMemo(
    () => ({
      user: session?.user || null,
      ai: session?.ai || { enabled: false },
      demoData: !!session?.demo_data,
      loading,
      login,
      register,
      setup,
      logout,
      refresh
    }),
    [session, loading, login, register, setup, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ssh-theme', theme);
  }, [theme]);
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))];
}
