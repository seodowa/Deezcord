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
    unsendMessage: socketUnsendMessage,
    startTyping: socketStartTyping,
    stopTyping: socketStopTyping,
    addReaction: socketAddReaction,
    removeReaction: socketRemoveReaction,
    onMessage,
    onMessageDeleted,
    onReactionUpdate,
    onTyping,
    onPresenceUpdate,
    onRoomCreated,
    onRoomDeleted,
    onChannelCreated
  } = useSocket();

  const fetchMembers = useCallback(async (id: string) => {
    try {
      const data = await getRoomMembers(id);
      setMembers(data as Member[]);
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  }, []);

  const fetchMessages = useCallback(async (rId: string, cId: string) => {
    setIsLoadingMessages(true);
    try {
      const data = await getMessages(rId, cId);
      const messageData = data as Message[];
      console.log(`[Debug] Fetched ${messageData.length} messages. Messages with avatars:`, messageData.filter((m) => m.avatar_url).length);
      setMessages(messageData);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (roomId && isMember) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchMembers(roomId);
      if (channelId) {
        setMessages([]);
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
    const unsubscribe = onMessage((data: unknown) => {
      const newMessage = data as Message;
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
    const unsubscribe = onMessageDeleted((data) => {
      if (data.channel_id === channelId) {
        setMessages(prev => prev.filter(m => m.id !== data.message_id));
      }
    });
    return unsubscribe;
  }, [onMessageDeleted, channelId]);

  useEffect(() => {
    const unsubscribe = onReactionUpdate((data: any) => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === data.message_id) {
          return { ...msg, reactions: data.reactions };
        }
        return msg;
      }));
    });
    return unsubscribe;
  }, [onReactionUpdate]);

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

  const sendMessage = useCallback((content: string, fileUrl?: string, fileName?: string, parentId?: string | null) => {
    if (roomId && channelId && isMember) {
      socketSendMessage({ room_id: roomId, channel_id: channelId, content, file_url: fileUrl, file_name: fileName, parent_id: parentId });
      
      const parentMessage = parentId ? messages.find(m => m.id === parentId) : null;
      const tempId = `temp-${Date.now()}`;
      const newMessage: Message = {
        id: tempId,
        user_id: user?.id || null,
        room_id: roomId,
        channel_id: channelId,
        username: user?.username || user?.email.split('@')[0] || 'Me',
        content,
        created_at: new Date().toISOString(),
        avatar_url: user?.avatar_url,
        file_url: fileUrl,
        file_name: fileName,
        parent_id: parentId,
        parent_message: parentMessage ? {
          username: parentMessage.username,
          content: parentMessage.content
        } : null
      };
      setMessages(prev => [...prev, newMessage]);
      socketStopTyping({ room_id: roomId, channel_id: channelId });
    }
  }, [roomId, channelId, isMember, socketSendMessage, user, socketStopTyping, messages]);

  const unsendMessage = useCallback((messageId: string) => {
    if (roomId && channelId && isMember) {
      socketUnsendMessage({ message_id: messageId, channel_id: channelId });
      // Optimistic update
      setMessages(prev => prev.filter(m => m.id !== messageId));
    }
  }, [roomId, channelId, isMember, socketUnsendMessage]);

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

  const toggleReaction = useCallback((messageId: string, emoji: string) => {
    if (roomId && channelId && isMember && user) {
      const message = messages.find(m => m.id === messageId);
      const existingReaction = message?.reactions?.find(r => r.user_id === user.id && r.emoji === emoji);

      if (existingReaction) {
        socketRemoveReaction({ message_id: messageId, room_id: roomId, channel_id: channelId, emoji });
      } else {
        socketAddReaction({ message_id: messageId, room_id: roomId, channel_id: channelId, emoji });
      }
    }
  }, [roomId, channelId, isMember, user, messages, socketAddReaction, socketRemoveReaction]);

  return {
    messages,
    members,
    typingUsers,
    isLoadingMessages,
    sendMessage,
    unsendMessage,
    startTyping,
    stopTyping,
    toggleReaction,
    fetchMembers,
    onRoomCreated,
    onRoomDeleted,
    onChannelCreated
  };
};
