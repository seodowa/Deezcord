/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { getToken, setToken as setTokenUtil, removeToken as removeTokenUtil } from '../utils/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (token: string, rememberMe: boolean) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!getToken());

  // Optionally listen to storage events to sync auth state across tabs
  useEffect(() => {
    const handleStorageChange = () => {
      setIsAuthenticated(!!getToken());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = useCallback((token: string, rememberMe: boolean) => {
    setTokenUtil(token, rememberMe);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    removeTokenUtil();
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
