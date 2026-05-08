import { useState, useEffect, useCallback } from 'react';
import type { Room } from '../types/room';
import { getRooms, getDiscoverRooms, createRoom as apiCreateRoom, joinRoom as apiJoinRoom } from '../services/roomService';
import { useToast } from './useToast';
import { loadRooms, saveRooms } from '../utils/persistence';

export const useRooms = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [discoverRooms, setDiscoverRooms] = useState<Room[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isLoadingDiscover, setIsLoadingDiscover] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const { addToast } = useToast();

  const fetchRooms = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setIsLoadingRooms(true);
    }
    try {
      const data = await getRooms();
      setRooms(data);
      saveRooms(data);
    } catch (err) {
      const error = err as Error;
      addToast(error.message || 'Failed to load rooms', 'error');
    } finally {
      setIsLoadingRooms(false);
    }
  }, [addToast]);

  const fetchDiscoverRooms = useCallback(async () => {
    setIsLoadingDiscover(true);
    try {
      const data = await getDiscoverRooms();
      setDiscoverRooms(data);
    } catch (err) {
      console.error('Failed to load discovery rooms:', err);
    } finally {
      setIsLoadingDiscover(false);
    }
  }, []);

  const createNewRoom = async (name: string, file: File | null) => {
    setIsCreatingRoom(true);
    try {
      const newRoom = await apiCreateRoom(name, file);
      const roomWithMembership: Room = { ...newRoom, isMember: true, role: 'owner' };
      setRooms(prev => {
        const updated = [...prev, roomWithMembership];
        saveRooms(updated);
        return updated;
      });
      addToast(`Room "${name}" created successfully!`, 'success');
      return roomWithMembership;
    } catch (err) {
      const error = err as Error;
      addToast(error.message || 'Failed to create room', 'error');
      throw error;
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const joinExistingRoom = async (room: Room) => {
    setIsJoining(true);
    try {
      await apiJoinRoom(room.id);
      const updatedRoom: Room = { ...room, isMember: true, role: 'member' };
      
      setRooms(prev => {
        const updated = [...prev, updatedRoom];
        saveRooms(updated);
        return updated;
      });
      setDiscoverRooms(prev => prev.filter(r => r.id !== room.id));
      
      addToast(`Joined room "${room.name}"`, 'success');
      return updatedRoom;
    } catch (err) {
      const error = err as Error;
      addToast(error.message || 'Failed to join room', 'error');
      throw error;
    } finally {
      setIsJoining(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    // Try to load from cache first
    loadRooms().then(cached => {
      if (!isMounted) return;
      
      if (cached && cached.length > 0) {
        setRooms(cached as Room[]);
        setIsLoadingRooms(false);
        fetchRooms(false); // Silent sync
      } else {
        fetchRooms(true); // Full loading
      }
    });

    return () => { isMounted = false; };
  }, [fetchRooms]);

  return {
    rooms,
    setRooms,
    discoverRooms,
    setDiscoverRooms,
    isLoadingRooms,
    isLoadingDiscover,
    isCreatingRoom,
    isJoining,
    fetchRooms,
    fetchDiscoverRooms,
    createNewRoom,
    joinExistingRoom
  };
};
