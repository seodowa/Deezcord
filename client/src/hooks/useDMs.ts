import { useState, useCallback, useEffect } from 'react';
import { useSocket } from './useSocket';
import { getToken } from '../utils/auth';
import { saveDMs, loadDMs } from '../utils/persistence';
import type { Room } from '../types/room';

const API_URL = import.meta.env.VITE_API_URL;

export function useDMs() {
  const [dms, setDms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const token = getToken();
  const { onDMCreated } = useSocket();

  useEffect(() => {
    loadDMs().then((cached) => {
      if (cached && cached.length > 0) {
        setDms(cached as Room[]);
        setIsLoading(false);
      }
    });
  }, []);

  const fetchDMs = useCallback(async () => {
    if (!token) return;

    try {
      setError(null);
      const response = await fetch(`${API_URL}/api/dms`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch DMs');
      const data = await response.json();
      setDms(data);
      saveDMs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDMs();
  }, [fetchDMs]);

  useEffect(() => {
    const unsubscribe = onDMCreated(() => {
      fetchDMs();
    });
    return unsubscribe;
  }, [onDMCreated, fetchDMs]);

  const createDM = async (targetUserId: string): Promise<{ room: Room, channelId: string } | null> => {
    if (!token) return null;
    try {
      const response = await fetch(`${API_URL}/api/dms/${targetUserId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to create DM');
      const data = await response.json();
      
      // Optimistically update list if it's a new DM
      if (!dms.find(d => d.id === data.id)) {
          // We need to fetch again to get the full joined data with the target user profile
          fetchDMs(); 
      }

      return { room: data, channelId: data.defaultChannelId };
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  return {
    dms,
    isLoading,
    error,
    createDM,
    refreshDMs: fetchDMs
  };
}