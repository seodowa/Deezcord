import { fetchWithAuth } from '../utils/fetchWithAuth';

const API_URL = import.meta.env.VITE_API_URL;

export const uploadFile = async (roomId: string, channelId: string, file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetchWithAuth(`${API_URL}/api/rooms/${roomId}/channels/${channelId}/messages/upload`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to upload file');
  }

  const data = await response.json();
  return data.file_url;
};
