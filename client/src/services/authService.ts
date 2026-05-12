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

export const mfaVerify = async (tokenOrFactorId: string, factorIdOrCode: string, code?: string) => {
  // Overloaded handle: 
  // 1. (factorId, code) - uses stored token
  // 2. (token, factorId, code) - uses provided token
  let token: string | undefined;
  let factorId: string;
  let actualCode: string;

  if (code) {
    token = tokenOrFactorId;
    factorId = factorIdOrCode;
    actualCode = code;
  } else {
    factorId = tokenOrFactorId;
    actualCode = factorIdOrCode;
  }

  const response = await fetch(`${API_URL}/api/auth/mfa/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(token),
    },
    body: JSON.stringify({ factorId, code: actualCode }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to verify MFA');
  }

  return data;
};

export const mfaUnenroll = async (tokenOrFactorId: string, factorId?: string) => {
  let token: string | undefined;
  let actualFactorId: string;

  if (factorId) {
    token = tokenOrFactorId;
    actualFactorId = factorId;
  } else {
    actualFactorId = tokenOrFactorId;
  }

  const response = await fetch(`${API_URL}/api/auth/mfa/unenroll`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(token),
    },
    body: JSON.stringify({ factorId: actualFactorId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to remove MFA');
  }

  return data;
};


