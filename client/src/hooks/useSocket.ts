import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import msgpackParser from "socket.io-msgpack-parser";
import type { Socket } from 'socket.io-client';
import { getToken } from '../utils/auth';
import type { MessageReaction } from '../types/message';

const SOCKET_URL = import.meta.env.VITE_API_URL;

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      parser: msgpackParser,
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

  const sendMessage = useCallback((data: { room_id: string; channel_id: string; content: string; file_url?: string; file_name?: string; parent_id?: string | null; temp_id?: string }) => {
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
const onReactionAdded = useCallback((callback: (data: { message_id: string; reaction: MessageReaction }) => void) => {
  if (socketRef.current) {
    socketRef.current.on('reaction_added', callback);
    return () => {
      if (socketRef.current) {
        socketRef.current.off('reaction_added', callback);
      }
    };
  }
  return () => {};
}, []);

const onReactionRemoved = useCallback((callback: (data: { message_id: string; user_id: string; emoji: string }) => void) => {
  if (socketRef.current) {
    socketRef.current.on('reaction_removed', callback);
    return () => {
      if (socketRef.current) {
        socketRef.current.off('reaction_removed', callback);
      }
    };
  }
  return () => {};
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

  const onFriendRequestReceived = useCallback((callback: (data: { requesterId: string }) => void) => {
    if (socketRef.current) {
      socketRef.current.on('friend_request_received', callback);
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.off('friend_request_received', callback);
      }
    };
  }, []);

  const onFriendRequestAccepted = useCallback((callback: (data: { addresseeId: string }) => void) => {
    if (socketRef.current) {
      socketRef.current.on('friend_request_accepted', callback);
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.off('friend_request_accepted', callback);
      }
    };
  }, []);

  const onFriendRemoved = useCallback((callback: (data: { removedBy: string }) => void) => {
    if (socketRef.current) {
      socketRef.current.on('friend_removed', callback);
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.off('friend_removed', callback);
      }
    };
  }, []);

  const onDMCreated = useCallback((callback: (data: unknown) => void) => {
    if (socketRef.current) {
      socketRef.current.on('dm_created', callback);
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.off('dm_created', callback);
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
    onReactionAdded,
    onReactionRemoved,
    onTyping, 
    onPresenceUpdate, 
    onRoomCreated, 
    onRoomDeleted, 
    onChannelCreated,
    onFriendRequestReceived,
    onFriendRequestAccepted,
    onFriendRemoved,
    onDMCreated
  };
};
