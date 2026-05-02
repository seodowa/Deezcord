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

  const joinRoom = useCallback((roomId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join_room', roomId);
    }
  }, []);

  const leaveRoom = useCallback((roomId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('leave_room', roomId);
    }
  }, []);

  const sendMessage = useCallback((data: { room_id: string; content: string }) => {
    if (socketRef.current) {
      socketRef.current.emit('send_message', data);
    }
  }, []);

  const startTyping = useCallback((roomId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('typing_start', roomId);
    }
  }, []);

  const stopTyping = useCallback((roomId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('typing_stop', roomId);
    }
  }, []);

  const onMessage = useCallback((callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('receive_message', callback);
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.off('receive_message', callback);
      }
    };
  }, []);

  const onTyping = useCallback((callback: (data: { room_id: string; username: string; isTyping: boolean }) => void) => {
    if (socketRef.current) {
      socketRef.current.on('user_typing', callback);
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.off('user_typing', callback);
      }
    };
  }, []);

  return { isConnected, joinRoom, leaveRoom, sendMessage, startTyping, stopTyping, onMessage, onTyping };
};
