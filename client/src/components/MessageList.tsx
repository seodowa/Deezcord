import { useEffect, useRef, useState } from 'react';
import type { Message } from '../types/message';
import type { Member } from '../types/room';
import ReactionList from './ReactionList';

interface MessageListProps {
  messages: Message[];
  members?: Member[];
  currentUser?: { id?: string; username?: string; email?: string } | null;
  typingUsers?: string[];
  onToggleReaction?: (messageId: string, emoji: string) => void;
}

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '💯'];

export default function MessageList({ 
  messages, 
  members = [], 
  currentUser, 
  typingUsers = [],
  onToggleReaction
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activePickerId, setActivePickerId] = useState<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingUsers]);

  const currentUserId = currentUser?.id;
  const currentUsername = currentUser?.username || currentUser?.email?.split('@')[0] || '';

  // Close picker when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => setActivePickerId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Helper to find avatar from members list
  const getAvatarForUser = (userId: string | null, username: string, msgAvatar?: string | null) => {
    // 1. Try to find by user_id first (most reliable)
    if (userId) {
      const member = members.find(m => m.user_id === userId);
      if (member?.profiles.avatar_url) return member.profiles.avatar_url;
    }
    
    // 2. Fallback to username for legacy messages or if member list not yet loaded
    const memberByName = members.find(m => (m.profiles.username || '').toLowerCase() === username.toLowerCase());
    return memberByName?.profiles.avatar_url || msgAvatar || null;
  };

  // Helper to get current username for a user (handles name changes)
  const getUsernameForUser = (userId: string | null, originalUsername: string) => {
    if (userId) {
      const member = members.find(m => m.user_id === userId);
      if (member?.profiles.username) return member.profiles.username;
    }
    return originalUsername;
  };

  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700"
    >
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
          <div className="text-4xl mb-4">💬</div>
          <p>No messages yet. Start the conversation!</p>
        </div>
      ) : (
        <>
          {messages.map((msg) => {
            // Determine if own message: use user_id if available, fallback to username
            const isOwn = currentUserId && msg.user_id 
              ? msg.user_id === currentUserId 
              : msg.username === currentUsername;
            
            const avatarUrl = getAvatarForUser(msg.user_id, msg.username, msg.avatar_url);
            const displayName = getUsernameForUser(msg.user_id, msg.username);
            const isPickerOpen = activePickerId === msg.id;

            return (
              <div 
                key={msg.id || `${msg.username}-${msg.created_at}`} 
                className={`flex gap-3 relative group ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className="flex-shrink-0 mt-1">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm overflow-hidden border border-white/10 ${
                    isOwn ? 'bg-blue-600' : 'bg-slate-500'
                  }`}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="opacity-80">{displayName.substring(0, 1).toUpperCase()}</span>
                    )}
                  </div>
                </div>

                <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[80%]`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {displayName}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <div className="relative group/content">
                    <div 
                      className={`px-4 py-2 rounded-2xl shadow-sm text-sm break-words ${
                        isOwn 
                          ? 'bg-blue-500 text-white rounded-tr-none' 
                          : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 border border-slate-200/50 dark:border-white/10 rounded-tl-none'
                      }`}
                    >
                      {msg.content}
                      
                      {msg.file_url && (
                        <div className={`mt-2 ${msg.content ? 'pt-2 border-t border-white/20 dark:border-white/10' : ''}`}>
                          {msg.file_url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) ? (
                            <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg">
                              <img 
                                src={msg.file_url} 
                                alt="Attachment" 
                                className="max-w-full max-h-64 object-contain hover:scale-[1.02] transition-transform duration-300"
                              />
                            </a>
                          ) : (
                            <a 
                              href={msg.file_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className={`flex items-center gap-2 p-2 rounded-lg border transition-all duration-300 ${
                                isOwn 
                                  ? 'bg-white/20 border-white/30 hover:bg-white/30 text-white' 
                                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-500'
                              }`}
                            >
                              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="text-xs font-medium truncate max-w-[150px] md:max-w-[250px]">
                                {msg.file_name || 'Download Attachment'}
                              </span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Reaction Trigger Button - Only visible on hover */}
                    {onToggleReaction && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePickerId(isPickerOpen ? null : msg.id);
                        }}
                        className={`absolute top-0 w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-white/10 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 ${
                          isOwn ? '-left-10' : '-right-10'
                        }`}
                        title="Add reaction"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    )}

                    {/* Reaction Picker Popover */}
                    {onToggleReaction && isPickerOpen && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className={`absolute -top-12 z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-full p-1 shadow-xl animate-fade-in-up ${
                          isOwn ? 'right-0' : 'left-0'
                        }`}
                      >
                        <div className="flex gap-1">
                          {COMMON_EMOJIS.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => {
                                onToggleReaction(msg.id, emoji);
                                setActivePickerId(null);
                              }}
                              className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors text-base"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reaction List */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <ReactionList 
                      reactions={msg.reactions} 
                      currentUserId={currentUserId}
                      onToggleReaction={(emoji) => onToggleReaction?.(msg.id, emoji)}
                    />
                  )}
                </div>
              </div>
            );
          })}
          
          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 animate-pulse pb-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
              </div>
              <span>
                {typingUsers.length === 1 
                  ? `${typingUsers[0]} is typing...` 
                  : typingUsers.length === 2 
                    ? `${typingUsers[0]} and ${typingUsers[1]} are typing...` 
                    : `${typingUsers.length} people are typing...`}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
