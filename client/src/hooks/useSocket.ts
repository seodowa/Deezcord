import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { getToken } from '../utils/auth';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Socket connected');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket disconnected');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinRoom = useCallback((data: { room_id: string; channel_id?: string } | string) => {
    if (socketRef.current) {
      socketRef.current.emit('join_room', data);
    }
  }, []);

  const leaveRoom = useCallback((data: { room_id: string; channel_id?: string } | string) => {
    if (socketRef.current) {
      socketRef.current.emit('leave_room', data);
    }
  }, []);

  const sendMessage = useCallback((data: { room_id: string; channel_id: string; content: string; file_url?: string; file_name?: string }) => {
    if (socketRef.current) {
      socketRef.current.emit('send_message', data);
    }
  }, []);

  const unsendMessage = useCallback((data: { message_id: string; channel_id: string }) => {
    if (socketRef.current) {
      socketRef.current.emit('unsend_message', data);
    }
  }, []);

  const startTyping = useCallback((data: { room_id: string; channel_id?: string } | string) => {
    if (socketRef.current) {
      socketRef.current.emit('typing_start', data);
    }
  }, []);

  const stopTyping = useCallback((data: { room_id: string; channel_id?: string } | string) => {
    if (socketRef.current) {
      socketRef.current.emit('typing_stop', data);
    }
  }, []);

  const addReaction = useCallback((data: { message_id: string; room_id: string; channel_id: string; emoji: string }) => {
    if (socketRef.current) {
      socketRef.current.emit('add_reaction', data);
    }
  }, []);

  const removeReaction = useCallback((data: { message_id: string; room_id: string; channel_id: string; emoji: string }) => {
    if (socketRef.current) {
      socketRef.current.emit('remove_reaction', data);
    }
  }, []);

  const onMessage = useCallback((callback: (data: unknown) => void) => {
    if (socketRef.current) {
      socketRef.current.on('receive_message', callback);
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.off('receive_message', callback);
      }
    };
  }, []);

  const onMessageDeleted = useCallback((callback: (data: { message_id: string; channel_id: string }) => void) => {
    if (socketRef.current) {
      socketRef.current.on('message_deleted', callback);
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.off('message_deleted', callback);
      }
    };
  }, []);

  const onReactionUpdate = useCallback((callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('reaction_update', callback);
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.off('reaction_update', callback);
      }
    };
  }, []);

  const onTyping = useCallback((callback: (data: { room_id: string; channel_id?: string; username: string; isTyping: boolean }) => void) => {
    if (socketRef.current) {
      socketRef.current.on('user_typing', callback);
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.off('user_typing', callback);
      }
    };
  }, []);

  const onPresenceUpdate = useCallback((callback: (data: { userId: string; status: 'online' | 'offline' }) => void) => {
    if (socketRef.current) {
      socketRef.current.on('presence_update', callback);
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.off('presence_update', callback);
      }
    };
  }, []);

  const onRoomCreated = useCallback((callback: (data: unknown) => void) => {
    if (socketRef.current) {
      socketRef.current.on('room_created', callback);
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.off('room_created', callback);
      }
    };
  }, []);

  const onRoomDeleted = useCallback((callback: (roomId: string) => void) => {
    if (socketRef.current) {
      socketRef.current.on('room_deleted', callback);
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.off('room_deleted', callback);
      }
    };
  }, []);

  const onChannelCreated = useCallback((callback: (data: unknown) => void) => {
    if (socketRef.current) {
      socketRef.current.on('channel_created', callback);
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.off('channel_created', callback);
      }
    };
  }, []);

  return { 
    isConnected, 
    joinRoom, 
    leaveRoom, 
    sendMessage,
    unsendMessage,
    startTyping, 
    stopTyping, 
    addReaction,
    removeReaction,
    onMessage,
    onMessageDeleted,
    onReactionUpdate,
    onTyping, 
    onPresenceUpdate, 
    onRoomCreated, 
    onRoomDeleted, 
    onChannelCreated 
  };
};
