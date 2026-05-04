import { getToken } from '../utils/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const uploadFile = async (roomId: string, channelId: string, file: File): Promise<string> => {
  const token = getToken();
  if (!token) throw new Error('No authentication token found');

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/rooms/${roomId}/channels/${channelId}/messages/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to upload file');
  }

  const data = await response.json();
  return data.file_url;
};
