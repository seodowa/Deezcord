import { v4 as uuidv4 } from 'uuid';

export const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
};

export const setTokens = (token: string, refreshToken: string, rememberMe: boolean) => {
  if (rememberMe) {
    localStorage.setItem('sb-token', token);
    localStorage.setItem('sb-refresh-token', refreshToken);
    sessionStorage.removeItem('sb-token');
    sessionStorage.removeItem('sb-refresh-token');
    sessionStorage.removeItem('sb-session-start'); // Ensure no limit for remembered users
  } else {
    sessionStorage.setItem('sb-token', token);
    sessionStorage.setItem('sb-refresh-token', refreshToken);
    
    // Only set the start time if it doesn't already exist (don't overwrite on refresh)
    if (!sessionStorage.getItem('sb-session-start')) {
      sessionStorage.setItem('sb-session-start', Date.now().toString());
    }
    
    localStorage.removeItem('sb-token');
    localStorage.removeItem('sb-refresh-token');
  }
};

export const getToken = (): string | null => {
  return localStorage.getItem('sb-token') || sessionStorage.getItem('sb-token');
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem('sb-refresh-token') || sessionStorage.getItem('sb-refresh-token');
};

export const removeTokens = () => {
  localStorage.removeItem('sb-token');
  localStorage.removeItem('sb-refresh-token');
  sessionStorage.removeItem('sb-token');
  sessionStorage.removeItem('sb-refresh-token');
  sessionStorage.removeItem('sb-session-start');
};

export const assertSessionNotExpired = () => {
  const sessionStart = sessionStorage.getItem('sb-session-start');
  if (sessionStart) {
    const elapsedMs = Date.now() - parseInt(sessionStart, 10);
    const twelveHoursMs = 12 * 60 * 60 * 1000;
    
    if (elapsedMs > twelveHoursMs) {
      throw new Error('SESSION_EXPIRED_LIMIT');
    }
  }
};

export const getAuthHeaders = (tokenOverride?: string) => {
  const token = tokenOverride || getToken();
  const deviceId = getDeviceId();
  const headers: Record<string, string> = {
    'X-Device-Id': deviceId,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const getAAL = (): 'aal1' | 'aal2' | null => {
  const token = getToken();
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.aal || 'aal1';
  } catch (e) {
    return 'aal1';
  }
};
