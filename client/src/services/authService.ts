import { getAuthHeaders, getDeviceId } from '../utils/auth';

const API_URL = import.meta.env.VITE_API_URL;

export const registerUser = async (username: string, email: string, password: string) => {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ username, email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to register');
  }

  return data;
};

export const loginUser = async (identifier: string, password: string) => {
  const deviceId = getDeviceId();
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ identifier, password, deviceId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to login');
  }

  return data;
};

export const refreshSession = async (refreshToken: string) => {
  const deviceId = getDeviceId();
  const response = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ refreshToken, deviceId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to refresh session');
  }

  return data;
};

export const forgotPassword = async (email: string) => {
  const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to send reset link');
  }

  return data;
};

export const resetPassword = async (code: string, password: string) => {
  const response = await fetch(`${API_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ code, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to reset password');
  }

  return data;
};

/**
 * MFA SERVICES (Calling Express Backend)
 */

export const mfaEnroll = async (token?: string) => {
  const response = await fetch(`${API_URL}/api/auth/mfa/enroll`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(token),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to start MFA enrollment');
  }

  return data;
};

export const mfaListFactors = async (token?: string) => {
  const response = await fetch(`${API_URL}/api/auth/mfa/factors`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(token),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to list MFA factors');
  }

  return data;
};

export const mfaVerify = async (token: string, factorId: string, code: string) => {
  const response = await fetch(`${API_URL}/api/auth/mfa/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ factorId, code }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to verify MFA');
  }

  return data;
};

export const mfaVerifyEmail = async (token: string, code: string, purpose: 'setup' | 'transactional') => {
  const response = await fetch(`${API_URL}/api/auth/mfa/email/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ code, purpose })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Verification failed');
  return data;
};

export const mfaRequestEmail = async (purpose: string = 'transactional', token?: string) => {
  const response = await fetch(`${API_URL}/api/auth/mfa/email/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(token),
    },
    body: JSON.stringify({ purpose }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to request email code');
  }

  return data;
};

export const mfaSetupVerifyEmail = async (code: string, token?: string) => {
  const response = await fetch(`${API_URL}/api/auth/mfa/email/setup-verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(token),
    },
    body: JSON.stringify({ code }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to verify email MFA setup');
  }

  return data;
};

export const mfaUnenroll = async (token: string, factorId?: string, mfaCode?: string) => {
  const response = await fetch(`${API_URL}/api/auth/mfa/unenroll`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(token),
      ...(mfaCode ? { 'x-mfa-code': mfaCode } : {}),
    },
    body: JSON.stringify({ factorId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to remove MFA');
  }

  return data;
};


