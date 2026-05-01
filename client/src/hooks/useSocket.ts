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

  const sendMessage = useCallback((data: { room_id: string; content: string }) => {
    if (socketRef.current) {
      socketRef.current.emit('send_message', data);
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

  return { isConnected, joinRoom, sendMessage, onMessage };
};
