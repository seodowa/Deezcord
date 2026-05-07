import { getToken } from '../utils/auth';
import type { User } from '../types/user';

const API_URL = import.meta.env.VITE_API_URL;

export const getCurrentUser = async () => {
  const token = getToken();
  if (!token) throw new Error('No token found');

  const response = await fetch(`${API_URL}/api/users/me`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch user info');
  }

  return data.user;
};

export const updateProfile = async (username?: string, file?: File | null) => {
  const token = getToken();
  if (!token) throw new Error('No token found');

  const formData = new FormData();
  if (username) formData.append('username', username);
  if (file) formData.append('file', file);

  const response = await fetch(`${API_URL}/api/users/profile`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to update profile');
  }

  return data;
};

export const updatePassword = async (password: string) => {
  const token = getToken();
  if (!token) throw new Error('No token found');

  const response = await fetch(`${API_URL}/api/users/password`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to update password');
  }

  return data;
};

export const searchUsers = async (query: string): Promise<User[]> => {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_URL}/api/users/search?q=${encodeURIComponent(query)}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to search users');
  }

  return data;
};