import { useState, useEffect, useCallback } from 'react';
import type { Message } from '../types/message';
import type { Member } from '../types/room';
import { getRoomMembers, getMessages } from '../services/roomService';
import { useSocket } from './useSocket';
import { useAuth } from './useAuth';

export const useChat = (roomId: string | undefined, channelId: string | undefined, isMember: boolean | undefined) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const { user } = useAuth();
  const { 
    joinRoom: socketJoinRoom, 
    leaveRoom: socketLeaveRoom,
    sendMessage: socketSendMessage, 
    startTyping: socketStartTyping,
    stopTyping: socketStopTyping,
    onMessage,
    onTyping,
    onPresenceUpdate
  } = useSocket();

  const fetchMembers = useCallback(async (id: string) => {
    try {
      const data = await getRoomMembers(id);
      setMembers(data);
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  }, []);

  const fetchMessages = useCallback(async (rId: string, cId: string) => {
    setIsLoadingMessages(true);
    try {
      const data = await getMessages(rId, cId);
      console.log(`[Debug] Fetched ${data.length} messages. Messages with avatars:`, data.filter((m: any) => m.avatar_url).length);
      setMessages(data);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (roomId && isMember) {
      fetchMembers(roomId);
      if (channelId) {
        fetchMessages(roomId, channelId);
        socketJoinRoom({ room_id: roomId, channel_id: channelId });
      } else {
        socketJoinRoom({ room_id: roomId });
      }
      setTypingUsers([]);
      
      return () => {
        if (channelId) {
          socketLeaveRoom({ room_id: roomId, channel_id: channelId });
        } else {
          socketLeaveRoom({ room_id: roomId });
        }
      };
    } else {
      setMembers([]);
      setMessages([]);
      setTypingUsers([]);
    }
  }, [roomId, channelId, isMember, fetchMembers, fetchMessages, socketJoinRoom, socketLeaveRoom]);

  useEffect(() => {
    const unsubscribe = onMessage((newMessage) => {
      if (newMessage.room_id === roomId && newMessage.channel_id === channelId) {
        setMessages(prev => {
          const exists = prev.some(m => m.id === newMessage.id);
          if (exists) return prev;
          
          const filtered = prev.filter(m => 
            !(m.id.startsWith('temp-') && m.content === newMessage.content && m.username === newMessage.username)
          );

          return [...filtered, {
            ...newMessage,
            id: newMessage.id || Date.now().toString(),
            created_at: newMessage.created_at || new Date().toISOString()
          }];
        });
      }
    });
    return unsubscribe;
  }, [onMessage, roomId, channelId]);

  useEffect(() => {
    const unsubscribe = onTyping((data) => {
      if (data.room_id === roomId && data.channel_id === channelId) {
        setTypingUsers(prev => {
          if (data.isTyping) {
            if (prev.includes(data.username)) return prev;
            return [...prev, data.username];
          } else {
            return prev.filter(u => u !== data.username);
          }
        });
      }
    });
    return unsubscribe;
  }, [onTyping, roomId, channelId]);

  useEffect(() => {
    const unsubscribe = onPresenceUpdate((data) => {
      setMembers(prev => prev.map(member => {
        if (member.user_id === data.userId) {
          return { ...member, isOnline: data.status === 'online' };
        }
        return member;
      }));
    });
    return unsubscribe;
  }, [onPresenceUpdate]);

  const sendMessage = useCallback((content: string) => {
    if (roomId && channelId && isMember) {
      socketSendMessage({ room_id: roomId, channel_id: channelId, content });
      
      const tempId = `temp-${Date.now()}`;
      const newMessage: Message = {
        id: tempId,
        user_id: user?.id || null,
        room_id: roomId,
        channel_id: channelId,
        username: user?.username || user?.email.split('@')[0] || 'Me',
        content,
        created_at: new Date().toISOString(),
        avatar_url: user?.avatar_url
      };
      setMessages(prev => [...prev, newMessage]);
      socketStopTyping({ room_id: roomId, channel_id: channelId });
    }
  }, [roomId, channelId, isMember, socketSendMessage, user, socketStopTyping]);

  const startTyping = useCallback(() => {
    if (roomId && channelId && isMember) {
      socketStartTyping({ room_id: roomId, channel_id: channelId });
    }
  }, [roomId, channelId, isMember, socketStartTyping]);

  const stopTyping = useCallback(() => {
    if (roomId && channelId && isMember) {
      socketStopTyping({ room_id: roomId, channel_id: channelId });
    }
  }, [roomId, channelId, isMember, socketStopTyping]);

  return {
    messages,
    members,
    typingUsers,
    isLoadingMessages,
    sendMessage,
    startTyping,
    stopTyping,
    fetchMembers
  };
};
