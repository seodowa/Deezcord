import { useEffect, useRef } from 'react';
import type { Message } from '../types/message';

interface MessageListProps {
  messages: Message[];
  currentUserEmail?: string;
}

export default function MessageList({ messages, currentUserEmail }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const currentUsername = currentUserEmail?.split('@')[0] || '';

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
        messages.map((msg) => {
          const isOwn = msg.username === currentUsername;
          return (
            <div 
              key={msg.id || `${msg.username}-${msg.created_at}`} 
              className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {msg.username}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div 
                className={`max-w-[80%] px-4 py-2 rounded-2xl shadow-sm text-sm ${
                  isOwn 
                    ? 'bg-blue-500 text-white rounded-tr-none' 
                    : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 border border-slate-200/50 dark:border-white/10 rounded-tl-none'
                }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
