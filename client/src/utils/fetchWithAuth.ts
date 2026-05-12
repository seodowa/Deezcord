import { getAuthHeaders, getRefreshToken, setTokens, removeTokens, assertSessionNotExpired } from './auth';
import { refreshSession } from '../services/authService';

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

/**
 * Enhanced fetch wrapper that:
 * 1. Automatically injects Auth and Device headers.
 * 2. Intercepts 401 errors to perform silent refresh.
 * 3. Prevents race conditions during multiple concurrent refreshes.
 * 4. Enforces the 12-hour session limit.
 */
export const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
  // 1. Inject initial headers
  const headers = {
    ...options.headers,
    ...getAuthHeaders()
  };

  const finalOptions = {
    ...options,
    headers
  };

  // 2. Perform initial request
  let response = await fetch(url, finalOptions);

  // 3. Handle 401 Unauthorized (likely expired token)
  if (response.status === 401) {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      // No refresh token available, logout and return original response
      removeTokens();
      return response;
    }

    // Check if we are already refreshing
    if (isRefreshing) {
      // Wait for the current refresh to finish
      return new Promise((resolve) => {
        refreshQueue.push((newToken: string) => {
          // Retry original request with the new token
          const retriedHeaders = {
            ...options.headers,
            ...getAuthHeaders(newToken)
          };
          resolve(fetch(url, { ...options, headers: retriedHeaders }));
        });
      });
    }

    isRefreshing = true;

    try {
      // Enforce 12-hour limit before attempting refresh
      assertSessionNotExpired();

      // Perform the refresh
      const data = await refreshSession(refreshToken);
      const rememberMe = !!localStorage.getItem('sb-refresh-token');
      
      // Update tokens in storage
      setTokens(data.token, data.refreshToken, rememberMe);

      // Resolve the queue
      refreshQueue.forEach((callback) => callback(data.token));
      refreshQueue = [];
      isRefreshing = false;

      // Retry the original request
      const finalHeaders = {
        ...options.headers,
        ...getAuthHeaders(data.token)
      };
      return await fetch(url, { ...options, headers: finalHeaders });
    } catch (error) {
      // Refresh failed (expired refresh token or 12h limit reached)
      isRefreshing = false;
      refreshQueue = [];
      removeTokens();
      
      // Optionally trigger a window reload or context update to clear UI state
      // window.location.href = '/login'; 
      
      return response;
    }
  }

  return response;
};
