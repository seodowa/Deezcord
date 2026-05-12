import { useState, useEffect, useCallback } from 'react';
import type { Message } from '../types/message';
import type { Member } from '../types/room';
import { getRoomMembers, getMessages } from '../services/roomService';
import { useSocket } from './useSocket';
import { useAuth } from './useAuth';
import { loadMessages, saveMessages, loadMembers, saveMembers } from '../utils/persistence';

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
    onReactionAdded,
    onReactionRemoved,
    onTyping,
    onPresenceUpdate,
    onRoomCreated,
    onRoomDeleted,
    onChannelCreated
  } = useSocket();

  const fetchMembers = useCallback(async (id: string) => {
    try {
      const data = await getRoomMembers(id);
      const memberData = data as Member[];
      setMembers(memberData);
      saveMembers(id, memberData);
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  }, []);

  const fetchMessages = useCallback(async (rId: string, cId: string) => {
    // Only show loading state if we don't have cached messages
    setMessages(prev => {
      if (prev.length === 0) setIsLoadingMessages(true);
      return prev;
    });

    try {
      const data = await getMessages(rId, cId);
      const messageData = data as Message[];
      
      setMessages(messageData);
      // Update cache
      if (cId) saveMessages(cId, messageData);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (roomId && isMember) {
      // Try to load members from cache first
      loadMembers(roomId).then(cached => {
        if (cached && cached.length > 0) {
          setMembers(cached as Member[]);
        }
        fetchMembers(roomId);
      });

      if (channelId) {
        // Try to load from cache first
        loadMessages(channelId).then(cached => {
          if (cached && cached.length > 0) {
            setMessages(cached as Message[]);
          } else {
            setMessages([]);
          }
          fetchMessages(roomId, channelId);
        });
        socketJoinRoom({ room_id: roomId, channel_id: channelId });
      } else {
        socketJoinRoom({ room_id: roomId });
      }
      
      queueMicrotask(() => {
        setTypingUsers([]);
      });
      
      return () => {
        if (channelId) {
          socketLeaveRoom({ room_id: roomId, channel_id: channelId });
        } else {
          socketLeaveRoom({ room_id: roomId });
        }
      };
    } else {
      queueMicrotask(() => {
        setMembers([]);
        setMessages([]);
        setTypingUsers([]);
      });
    }
  }, [roomId, channelId, isMember, fetchMembers, fetchMessages, socketJoinRoom, socketLeaveRoom]);

  useEffect(() => {
    const unsubscribe = onMessage((data: unknown) => {
      const newMessage = data as Message;
      if (newMessage.room_id === roomId && newMessage.channel_id === channelId) {
        setMessages(prev => {
          const exists = prev.some(m => m.id === newMessage.id);
          if (exists) return prev;
          
          const filtered = prev.filter(m => {
            if (newMessage.temp_id && m.id === newMessage.temp_id) {
               return false; // Remove the exact temporary message
            }
            // Fallback for older messages or if temp_id isn't available
            return !(m.id.startsWith('temp-') && m.content === newMessage.content && m.username === newMessage.username);
          });

          const updated = [...filtered, {
            ...newMessage,
            id: newMessage.id,
            created_at: newMessage.created_at
          }].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

          // Update cache with the new message
          if (channelId) saveMessages(channelId, updated);
          
          return updated;
        });
      }
    });
    return unsubscribe;
  }, [onMessage, roomId, channelId]);

  useEffect(() => {
    const unsubscribe = onMessageDeleted((data) => {
      if (data.channel_id === channelId) {
        setMessages(prev => {
          const updated = prev.filter(m => m.id !== data.message_id);
          if (channelId) saveMessages(channelId, updated);
          return updated;
        });
      }
    });
    return unsubscribe;
  }, [onMessageDeleted, channelId]);

  useEffect(() => {
    const unsubscribeAdded = onReactionAdded((data) => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === data.message_id) {
          const currentReactions = msg.reactions || [];
          const exists = currentReactions.some(r => r.id === data.reaction.id);
          if (!exists) {
            return { ...msg, reactions: [...currentReactions, data.reaction] };
          }
        }
        return msg;
      }));
    });

    const unsubscribeRemoved = onReactionRemoved((data) => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === data.message_id) {
          const currentReactions = msg.reactions || [];
          return { ...msg, reactions: currentReactions.filter(r => !(r.user_id === data.user_id && r.emoji === data.emoji)) };
        }
        return msg;
      }));
    });

    return () => {
      unsubscribeAdded();
      unsubscribeRemoved();
    };
  }, [onReactionAdded, onReactionRemoved]);

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
      const tempId = `temp-${crypto.randomUUID()}`;
      socketSendMessage({ room_id: roomId, channel_id: channelId, content, file_url: fileUrl, file_name: fileName, parent_id: parentId, temp_id: tempId });
      
      const parentMessage = parentId ? messages.find(m => m.id === parentId) : null;
      const newMessage: Message = {
        id: tempId,
        user_id: user?.id || null,
        room_id: roomId,
        channel_id: channelId,
        username: user?.username || user?.email?.split('@')[0] || 'Me',
        content,
        created_at: new Date().toISOString(),
        avatar_url: user?.avatar_url,
        file_url: fileUrl,
        file_name: fileName,
        parent_id: parentId,
        parent_message: parentMessage ? {
          username: parentMessage.username,
          content: parentMessage.content
        } : null,
        temp_id: tempId
      };
      setMessages(prev => {
        const updated = [...prev, newMessage];
        if (channelId) saveMessages(channelId, updated);
        return updated;
      });
      socketStopTyping({ room_id: roomId, channel_id: channelId });
    }
  }, [roomId, channelId, isMember, socketSendMessage, user, socketStopTyping, messages]);

  const unsendMessage = useCallback((messageId: string) => {
    if (roomId && channelId && isMember) {
      socketUnsendMessage({ message_id: messageId, channel_id: channelId });
      // Optimistic update
      setMessages(prev => {
        const updated = prev.filter(m => m.id !== messageId);
        if (channelId) saveMessages(channelId, updated);
        return updated;
      });
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
