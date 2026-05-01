import { useState, useEffect, useCallback } from 'react';
import type { Room } from '../types/room';
import { getRooms, getDiscoverRooms, createRoom as apiCreateRoom, joinRoom as apiJoinRoom } from '../services/roomService';
import { useToast } from './useToast';

export const useRooms = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [discoverRooms, setDiscoverRooms] = useState<Room[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isLoadingDiscover, setIsLoadingDiscover] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const { addToast } = useToast();

  const fetchRooms = useCallback(async () => {
    setIsLoadingRooms(true);
    try {
      const data = await getRooms();
      setRooms(data);
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

  const createNewRoom = async (name: string) => {
    setIsCreatingRoom(true);
    try {
      const newRoom = await apiCreateRoom(name);
      const roomWithMembership: Room = { ...newRoom, isMember: true, role: 'owner' };
      setRooms(prev => [...prev, roomWithMembership]);
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
      
      setRooms(prev => [...prev, updatedRoom]);
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
    fetchRooms();
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
