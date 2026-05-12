import { fetchWithAuth } from '../utils/fetchWithAuth';
import type { Room } from '../types/room';

const API_URL = import.meta.env.VITE_API_URL;

export const getRooms = async (): Promise<Room[]> => {
  const response = await fetchWithAuth(`${API_URL}/api/rooms`);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch rooms');
  }

  return data;
};

export const getDiscoverRooms = async (): Promise<Room[]> => {
  const response = await fetchWithAuth(`${API_URL}/api/rooms/discover`);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch discovery rooms');
  }

  return data;
};

export const createRoom = async (name: string, file: File | null): Promise<Room> => {
  const formData = new FormData();
  formData.append('name', name);
  if (file) {
    formData.append('file', file);
  }

  const response = await fetchWithAuth(`${API_URL}/api/rooms`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to create room');
  }

  return data;
};

export const joinRoom = async (roomId: string): Promise<void> => {
  const response = await fetchWithAuth(`${API_URL}/api/rooms/${roomId}/join`, {
    method: 'POST',
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to join room');
  }
};

export const getRoomMembers = async (roomId: string): Promise<unknown[]> => {
  const response = await fetchWithAuth(`${API_URL}/api/rooms/${roomId}/members`);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch members');
  }

  return data;
};

export const getChannels = async (roomId: string): Promise<unknown[]> => {
  const response = await fetchWithAuth(`${API_URL}/api/rooms/${roomId}/channels`);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch channels');
  }

  return data;
};

export const createChannel = async (roomId: string, name: string, type: string = 'text'): Promise<unknown> => {
  const response = await fetchWithAuth(`${API_URL}/api/rooms/${roomId}/channels`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, type }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to create channel');
  }

  return data;
};

export const getMessages = async (roomId: string, channelId: string): Promise<unknown> => {
  const response = await fetchWithAuth(`${API_URL}/api/rooms/${roomId}/channels/${channelId}/messages`);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch messages');
  }

  return data;
};

export const updateRoom = async (roomId: string, name?: string, file?: File | null): Promise<Room> => {
  const formData = new FormData();
  if (name) formData.append('name', name);
  if (file) formData.append('file', file);

  const response = await fetchWithAuth(`${API_URL}/api/rooms/${roomId}`, {
    method: 'PATCH',
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to update room');
  }

  return data;
};

export const addMember = async (roomId: string, email: string): Promise<void> => {
  const response = await fetchWithAuth(`${API_URL}/api/rooms/${roomId}/members`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to add member');
  }
};

export const kickMember = async (roomId: string, userId: string): Promise<void> => {
  const response = await fetchWithAuth(`${API_URL}/api/rooms/${roomId}/members/${userId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to remove member');
  }
};

export const leaveRoom = async (roomId: string): Promise<void> => {
  const response = await fetchWithAuth(`${API_URL}/api/rooms/${roomId}/leave`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to leave room');
  }
};

export const deleteRoom = async (roomId: string, mfaCode?: string): Promise<void> => {
  const headers: Record<string, string> = {};

  if (mfaCode) {
    headers['x-mfa-code'] = mfaCode;
  }

  const response = await fetchWithAuth(`${API_URL}/api/rooms/${roomId}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const data = await response.json();
    const error = new Error(data.error || 'Failed to delete room');
    // Attach error code for transactional MFA interception
    if (data.error === 'MFA_REQUIRED_TRANSACTIONAL') {
      (error as any).code = 'MFA_REQUIRED_TRANSACTIONAL';
    }
    throw error;
  }
};

