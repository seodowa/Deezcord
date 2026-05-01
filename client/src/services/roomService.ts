import { getToken } from '../utils/auth';
import type { Room } from '../types/room';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const getRooms = async (): Promise<Room[]> => {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_URL}/rooms`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch rooms');
  }

  return data;
};

export const getDiscoverRooms = async (): Promise<Room[]> => {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_URL}/rooms/discover`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch discovery rooms');
  }

  return data;
};

export const createRoom = async (name: string, file: File | null): Promise<Room> => {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const formData = new FormData();
  formData.append('name', name);
  if (file) {
    formData.append('file', file);
  }

  const response = await fetch(`${API_URL}/rooms`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // Note: Don't set Content-Type header when using FormData; 
      // the browser will set it automatically with the boundary.
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to create room');
  }

  return data;
};

export const joinRoom = async (roomId: string): Promise<void> => {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_URL}/rooms/${roomId}/join`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to join room');
  }
};

export const getRoomMembers = async (roomId: string): Promise<any[]> => {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_URL}/rooms/${roomId}/members`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch members');
  }

  return data;
};

export const getMessages = async (roomId: string): Promise<any> => {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_URL}/rooms/${roomId}/messages`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch messages');
  }

  return data;
};
