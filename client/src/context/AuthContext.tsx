/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { getToken, getRefreshToken, setTokens, removeTokens, assertSessionNotExpired, getAuthHeaders } from '../utils/auth';
import { getCurrentUser } from '../services/userService';
import { refreshSession } from '../services/authService';
import type { User } from '../types/user';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  setUser: (user: User | null) => void;
  login: (token: string, refreshToken: string, rememberMe: boolean) => void;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!getToken());
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchUser = useCallback(async () => {
    const token = getToken();
    const refreshToken = getRefreshToken();

    if (token) {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Initial session verification failed, attempting refresh...', error);
        
        // Attempt silent refresh if token is present but failed (likely expired)
        if (refreshToken) {
          try {
            assertSessionNotExpired();

            const data = await refreshSession(refreshToken);
            const rememberMe = !!localStorage.getItem('sb-refresh-token');
            setTokens(data.token, data.refreshToken, rememberMe);

            const userData = await getCurrentUser();
            setUser(userData);
            setIsAuthenticated(true);
          } catch (refreshError: unknown) {
            console.error('Silent refresh failed:', refreshError);
            removeTokens();
            setIsAuthenticated(false);
            setUser(null);
          }
        } else {
          removeTokens();
          setIsAuthenticated(false);
          setUser(null);
        }
      }
    } else if (refreshToken) {
      // No access token but refresh token exists - attempt refresh
      try {
        assertSessionNotExpired();

        const data = await refreshSession(refreshToken);
        const rememberMe = !!localStorage.getItem('sb-refresh-token');
        setTokens(data.token, data.refreshToken, rememberMe);

        const userData = await getCurrentUser();
        setUser(userData);
        setIsAuthenticated(true);
      } catch (refreshError) {
        console.error('Silent refresh failed from state:', refreshError);
        removeTokens();
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

  const login = useCallback(async (token: string, refreshToken: string, rememberMe: boolean) => {
    setTokens(token, refreshToken, rememberMe);
    setIsAuthenticated(true);
    try {
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to fetch user after login:', error);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Get the API URL from environment variables
      const API_URL = import.meta.env.VITE_API_URL;
      
      // Attempt server-side deregistration, but don't let it block local logout
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders()
      }).catch(err => console.error('Server-side logout failed:', err));
    } finally {
      removeTokens();
      setIsAuthenticated(false);
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({
    isAuthenticated,
    user,
    setUser,
    login,
    logout,
    isLoading
  }), [isAuthenticated, user, login, logout, isLoading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
