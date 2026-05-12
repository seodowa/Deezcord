import { fetchWithAuth } from '../utils/fetchWithAuth';
import type { User } from '../types/user';

const API_URL = import.meta.env.VITE_API_URL;

export const getFriendsList = async (): Promise<User[]> => {
  const response = await fetchWithAuth(`${API_URL}/api/friends/list`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch friends (Status: ${response.status})`);
  }

  return response.json();
};

export const getPendingFriends = async (): Promise<User[]> => {
  const response = await fetchWithAuth(`${API_URL}/api/friends/pending`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch pending requests (Status: ${response.status})`);
  }

  return response.json();
};

export const getFriendStatus = async (targetId: string): Promise<string> => {
  const response = await fetchWithAuth(`${API_URL}/api/friends/status/${targetId}`);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch friend status');
  }

  return data.status; // 'friends', 'request_sent', 'request_received', or 'none'
};

export const requestFriend = async (addresseeId: string): Promise<void> => {
  const response = await fetchWithAuth(`${API_URL}/api/friends/request/${addresseeId}`, {
    method: 'POST',
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to send friend request');
  }
};

export const acceptFriend = async (requesterId: string): Promise<void> => {
  const response = await fetchWithAuth(`${API_URL}/api/friends/accept/${requesterId}`, {
    method: 'POST',
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to accept friend request');
  }
};

export const removeFriend = async (targetId: string): Promise<void> => {
  const response = await fetchWithAuth(`${API_URL}/api/friends/${targetId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to remove friend');
  }
};
