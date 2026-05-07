import { getToken } from '../utils/auth';
import type { User } from '../types/user';

const API_URL = import.meta.env.VITE_API_URL;

export const getFriendsList = async (): Promise<User[]> => {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_URL}/api/friends/list`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch friends list');
  }

  return data;
};

export const getPendingFriends = async (): Promise<User[]> => {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_URL}/api/friends/pending`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch pending requests');
  }

  return data;
};

export const getFriendStatus = async (targetId: string): Promise<string> => {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_URL}/api/friends/status/${targetId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch friend status');
  }

  return data.status; // 'friends', 'request_sent', 'request_received', or 'none'
};

export const requestFriend = async (addresseeId: string): Promise<void> => {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_URL}/api/friends/request/${addresseeId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to send friend request');
  }
};

export const acceptFriend = async (requesterId: string): Promise<void> => {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_URL}/api/friends/accept/${requesterId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to accept friend request');
  }
};

export const removeFriend = async (targetId: string): Promise<void> => {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_URL}/api/friends/${targetId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to remove friend');
  }
};
