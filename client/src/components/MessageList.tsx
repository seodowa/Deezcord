import { useEffect, useRef } from 'react';
import type { Message } from '../types/message';
import type { Member } from '../types/room';

interface MessageListProps {
  messages: Message[];
  members?: Member[];
  currentUser?: { username?: string; email?: string } | null;
  typingUsers?: string[];
}

export default function MessageList({ 
  messages, 
  members = [], 
  currentUser, 
  typingUsers = [] 
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingUsers]);

  const currentUserId = currentUser?.id;
  const currentUsername = currentUser?.username || currentUser?.email?.split('@')[0] || '';

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
      className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700"
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

            return (
              <div 
                key={msg.id || `${msg.username}-${msg.created_at}`} 
                className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
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
                  <div 
                    className={`px-4 py-2 rounded-2xl shadow-sm text-sm ${
                      isOwn 
                        ? 'bg-blue-500 text-white rounded-tr-none' 
                        : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 border border-slate-200/50 dark:border-white/10 rounded-tl-none'
                    }`}
                  >
                    {msg.content}
                  </div>
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
