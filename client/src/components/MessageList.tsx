import { useEffect, useRef, useState, memo } from 'react';
import type { Message } from '../types/message';
import type { Member, Room, Channel } from '../types/room';
import ReactionList from './ReactionList';
import Modal from './Modal';
import AsyncButton from './AsyncButton';
import MessageSkeleton from './MessageSkeleton';

interface MessageListProps {
  messages: Message[];
  members?: Member[];
  currentUser?: { id?: string; username?: string; email?: string } | null;
  typingUsers?: string[];
  isLoadingMessages?: boolean;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReplyMessage?: (message: Message) => void;
  onUserClick?: (user: { id: string; username: string; avatar_url?: string | null }) => void;
  currentRoom?: Room | null;
  currentChannel?: Channel | null;
}

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '💯'];

function MessageListComponent({ 
  messages, 
  members = [], 
  currentUser, 
  typingUsers = [],
  isLoadingMessages = false,
  onToggleReaction,
  onDeleteMessage,
  onReplyMessage,
  onUserClick,
  currentRoom,
  currentChannel
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePointerDown = (msgId: string) => {
    longPressTimer.current = setTimeout(() => {
      setActiveMenuId(msgId);
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    }, 500);
  };

  const handlePointerUpOrLeave = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleConfirmDelete = async () => {
    if (messageToDelete && onDeleteMessage) {
      onDeleteMessage(messageToDelete);
      setMessageToDelete(null);
    }
  };

  // Scroll to bottom logic
  const lastMessageId = messages[messages.length - 1]?.id;
  const isInitialScroll = useRef(true);

  // Reset initial scroll tracking when the channel changes
  useEffect(() => {
    isInitialScroll.current = true;
  }, [currentChannel?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      // If it's the first time we're rendering messages for this channel, always scroll to bottom
      if (isInitialScroll.current && messages.length > 0) {
        // Use requestAnimationFrame/setTimeout to ensure the DOM (and any cached messages) is fully rendered
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 10);
        isInitialScroll.current = false;
        return;
      }

      // Otherwise, only auto-scroll if already at bottom or if it's a new message
      const isAtBottom = scrollRef.current.scrollHeight - scrollRef.current.scrollTop <= scrollRef.current.clientHeight + 150; // Increased threshold slightly for better UX
      if (isAtBottom) {
        // Use a tiny timeout for subsequent messages as well to ensure content height is updated
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 10);
      }
    }
  }, [lastMessageId, typingUsers, messages.length]);

  const currentUserId = currentUser?.id;
  const currentUsername = currentUser?.username || currentUser?.email?.split('@')[0] || '';

  // Close picker when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
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
      {/* Conversation Start Indicator */}
      {currentRoom && !isLoadingMessages && (
        <div className="flex flex-col items-center justify-center py-10 px-4 mt-4 mb-8 border-b border-slate-200/50 dark:border-white/10 text-center animate-fade-in">
          {currentRoom.is_dm && currentRoom.targetUser ? (
            <>
              <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-4xl font-bold text-slate-500 dark:text-slate-400 mb-4 shadow-xl overflow-hidden ring-4 ring-white dark:ring-slate-900">
                {currentRoom.targetUser.avatar_url ? (
                  <img src={currentRoom.targetUser.avatar_url} alt={currentRoom.targetUser.username} className="w-full h-full object-cover" />
                ) : (
                  currentRoom.targetUser.username.substring(0, 1).toUpperCase()
                )}
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-2">
                {currentRoom.targetUser.username}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md">
                This is the beginning of your direct message history with <span className="font-semibold text-slate-700 dark:text-slate-300">@{currentRoom.targetUser.username}</span>.
              </p>
            </>
          ) : currentChannel ? (
            <>
              <div className="w-20 h-20 rounded-3xl bg-blue-500 flex items-center justify-center text-4xl font-bold text-white mb-4 shadow-xl shadow-blue-500/20 ring-4 ring-white dark:ring-slate-900 overflow-hidden">
                {currentRoom.room_profile ? (
                  <img src={currentRoom.room_profile} alt={`${currentRoom.name} profile`} className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                )}
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-slate-50 mb-2 tracking-tight">
                Welcome to #{currentChannel.name}!
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md">
                This is the start of the <span className="font-semibold text-slate-700 dark:text-slate-300">#{currentChannel.name}</span> channel in {currentRoom.name}.
              </p>
            </>
          ) : null}
        </div>
      )}

      {isLoadingMessages ? (
        <MessageSkeleton />
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center opacity-50">
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
            const isMenuOpen = activeMenuId === msg.id;
            let avatarMargin = `mt-auto ${isOwn ? '' : 'mb-0.75'}`

            if (msg.reactions?.length && msg.parent_id) {
              avatarMargin = `mb-auto mt-11.5`
            } else if (msg.reactions?.length) {
              avatarMargin = `mb-auto pt-5`
            } 

            return (
              <div 
                id={`msg-${msg.id}`}
                key={msg.id || `${msg.username}-${msg.created_at}`} 
                className={`flex gap-3 relative group ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`shrink-0 ${avatarMargin}`}>
                  <div 
                    onClick={() => {
                      if (onUserClick && msg.user_id) {
                        onUserClick({ id: msg.user_id, username: displayName, avatar_url: avatarUrl });
                      }
                    }}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm overflow-hidden border border-white/10 ${
                      onUserClick && msg.user_id ? 'cursor-pointer hover:scale-105 transition-transform' : ''
                    } ${isOwn ? 'bg-blue-600' : 'bg-slate-500'}`}
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="opacity-80">{displayName.substring(0, 1).toUpperCase()}</span>
                    )}
                  </div>
                </div>

                <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[80%]`}>
                  {/* Reply Context */}
                  {msg.parent_id && (
                    <div className={`flex items-center gap-2 mb-1 opacity-70 hover:opacity-100 transition-opacity cursor-pointer group/reply ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                         onClick={() => {
                           const parentElement = document.getElementById(`msg-${msg.parent_id}`);
                           if (parentElement) {
                             parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                             parentElement.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2', 'dark:ring-offset-slate-900');
                             setTimeout(() => {
                               parentElement.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2', 'dark:ring-offset-slate-900');
                             }, 2000);
                           }
                         }}>
                      <div className="w-4 h-4 text-slate-400">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h10a8 8 0 018 8v2M3 10l5 5m-5-5l5-5" />
                        </svg>
                      </div>
                      <div className={`text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/5 truncate max-w-[200px] ${isOwn ? 'text-right' : 'text-left'}`}>
                        <span className="font-bold text-blue-500 mr-1">{msg.parent_message?.username || 'Unknown'}:</span>
                        <span className="text-slate-500 dark:text-slate-400 italic">"{msg.parent_message?.content || 'Original message'}"</span>
                      </div>
                    </div>
                  )}

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
                      className={`px-4 py-2 rounded-2xl shadow-sm text-sm break-words select-none lg:select-auto ${
                        isOwn 
                          ? 'bg-blue-500 text-white rounded-tr-none' 
                          : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 border border-slate-200/50 dark:border-white/10 rounded-tl-none'
                      }`}
                      style={{ WebkitTouchCallout: 'none' }}
                      onPointerDown={(e) => {
                        if (e.pointerType !== 'mouse') {
                          handlePointerDown(msg.id);
                        }
                      }}
                      onPointerUp={handlePointerUpOrLeave}
                      onPointerLeave={handlePointerUpOrLeave}
                      onPointerCancel={handlePointerUpOrLeave}
                      onContextMenu={(e) => {
                        if (window.matchMedia("(pointer: coarse)").matches || 'ontouchstart' in window) {
                          e.preventDefault();
                        }
                      }}
                    >
                      {msg.content}
                      
                      {msg.file_url && (
                        <div className={`mt-2 ${msg.content ? 'pt-2 border-t border-white/20 dark:border-white/10' : ''}`}>
                          {msg.file_url.match(/\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i) ? (
                            <a 
                              href={msg.file_url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="block overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-700/50 cursor-pointer"
                              style={{ 
                                aspectRatio: msg.file_width && msg.file_height ? `${msg.file_width} / ${msg.file_height}` : 'auto',
                                maxHeight: '256px',
                                maxWidth: msg.file_width && msg.file_height ? `min(100%, ${Math.min(msg.file_width, 400)}px)` : '100%',
                                width: msg.file_width && msg.file_height ? 'auto' : '100%'
                              }}
                            >
                              <img 
                                src={msg.file_url} 
                                alt="Attachment" 
                                loading="lazy"
                                width={msg.file_width || undefined}
                                height={msg.file_height || undefined}
                                className={`max-w-full h-full object-contain hover:scale-[1.02] transition-transform duration-300 opacity-0 animate-fade-in ${!msg.file_width ? 'min-h-[120px] w-full' : ''}`}
                                onLoad={(e) => (e.currentTarget.style.opacity = '1')}
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
                                                            } cursor-pointer`}
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

                    {/* Hover Actions Container */}
                    <div className={`hidden md:flex absolute top-1 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 ${
                      isOwn ? (onDeleteMessage ? '-left-[7rem]' : '-left-20') : '-right-20'
                    }`}>
                      {onReplyMessage && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onReplyMessage(msg);
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-white/10 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-pointer"
                          title="Reply"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l5 5m-5-5l5-5" />
                          </svg>
                        </button>
                      )}

                      {onToggleReaction && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(isMenuOpen ? null : msg.id);
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-white/10 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-pointer"
                          title="Add reaction"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      )}
                      
                      {isOwn && onDeleteMessage && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMessageToDelete(msg.id);
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-white/10 shadow-sm hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete message"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Reaction/Mobile Context Menu Popover */}
                    {isMenuOpen && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className={`absolute bottom-full mb-2 z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-full p-1 shadow-xl animate-fade-in-up w-max max-w-[85vw] md:max-w-none flex items-center ${
                                                  isOwn ? '-right-7' : '-left-7'
                                                } cursor-pointer`}
                      >
                        <div className="flex gap-1 items-center overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                          {onToggleReaction && COMMON_EMOJIS.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => {
                                onToggleReaction(msg.id, emoji);
                                setActiveMenuId(null);
                              }}
                              className="shrink-0 w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors text-base cursor-pointer"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>

                        {/* Mobile-only actions separator */}
                        {(onReplyMessage || (isOwn && onDeleteMessage)) && (
                          <div className="md:hidden shrink-0 w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                        )}

                        <div className="md:hidden flex gap-1 items-center shrink-0">
                          {/* Mobile-only Reply action */}
                          {onReplyMessage && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onReplyMessage(msg);
                                setActiveMenuId(null);
                              }}
                              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 cursor-pointer"
                              title="Reply"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l5 5m-5-5l5-5" />
                              </svg>
                            </button>
                          )}

                          {/* Mobile-only Delete action */}
                          {isOwn && onDeleteMessage && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMessageToDelete(msg.id);
                                setActiveMenuId(null);
                              }}
                              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 transition-colors cursor-pointer"
                              title="Delete message"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!messageToDelete}
        onClose={() => setMessageToDelete(null)}
        title="Delete Message"
        maxWidth="max-w-md"
        footer={
          <>
            <button
              onClick={() => setMessageToDelete(null)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <AsyncButton
              onClick={handleConfirmDelete}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              Delete
            </AsyncButton>
          </>
        }
      >
        <div className="flex items-center justify-center p-4 rounded-2xl d-600">
          Are you sure you want to delete this message? This action cannot be undone.
        </div>
      </Modal>
    </div>
  );
}

export default memo(MessageListComponent);
