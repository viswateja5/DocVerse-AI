import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/axios';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string, refresh: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    try {
      if (import.meta.env.DEV) console.log('[Auth] Fetching user profile...');
      const { data } = await api.get('/auth/me');
      if (import.meta.env.DEV) console.log('[Auth] User profile loaded:', data.email);
      setUser(data);
    } catch (error) {
      if (import.meta.env.DEV) console.error('[Auth] Failed to fetch user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      if (import.meta.env.DEV) console.log('[Auth] Found existing token, hydrating state...');
      fetchUser();
    } else {
      if (import.meta.env.DEV) console.log('[Auth] No token found on mount');
      setIsLoading(false);
    }
  }, []);

  const login = async (access: string, refresh: string) => {
    if (import.meta.env.DEV) console.log('[Auth] Login successful, saving tokens...');
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    await fetchUser();
  };

  const logout = () => {
    if (import.meta.env.DEV) console.log('[Auth] Logging out, clearing state...');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
