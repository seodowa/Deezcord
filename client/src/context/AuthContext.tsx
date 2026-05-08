/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { getToken, setToken as setTokenUtil, removeToken as removeTokenUtil } from '../utils/auth';
import { getCurrentUser } from '../services/userService';
import type { User } from '../types/user';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  setUser: (user: User | null) => void;
  login: (token: string, rememberMe: boolean) => void;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!getToken());
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchUser = useCallback(async () => {
    if (getToken()) {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Failed to fetch user:', error);
        removeTokenUtil();
        setIsAuthenticated(false);
        setUser(null);
      }
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Optionally listen to storage events to sync auth state across tabs
  useEffect(() => {
    const handleStorageChange = () => {
      const token = getToken();
      setIsAuthenticated(!!token);
      if (!token) setUser(null);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = useCallback(async (token: string, rememberMe: boolean) => {
    setTokenUtil(token, rememberMe);
    setIsAuthenticated(true);
    try {
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to fetch user after login:', error);
    }
  }, []);

  const logout = useCallback(() => {
    removeTokenUtil();
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, setUser, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
