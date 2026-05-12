import { fetchWithAuth } from '../utils/fetchWithAuth';
import type { User } from '../types/user';

const API_URL = import.meta.env.VITE_API_URL;

export const getCurrentUser = async () => {
  const response = await fetchWithAuth(`${API_URL}/api/users/me`);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch user info');
  }

  return data.user;
};

export const updateProfile = async (username?: string, file?: File | null) => {
  const formData = new FormData();
  if (username) formData.append('username', username);
  if (file) formData.append('file', file);

  const response = await fetchWithAuth(`${API_URL}/api/users/profile`, {
    method: 'PATCH',
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to update profile');
  }

  return data;
};

export const updatePassword = async (password: string) => {
  const response = await fetchWithAuth(`${API_URL}/api/users/password`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
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
  const response = await fetchWithAuth(`${API_URL}/api/friends/search?q=${encodeURIComponent(query)}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to search users');
  }

  return response.json();
};