import React, { useState, useRef, useEffect } from 'react';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  onStartTyping?: () => void;
  onStopTyping?: () => void;
  isDisabled?: boolean;
}

export default function MessageInput({ onSendMessage, onStartTyping, onStopTyping, isDisabled }: MessageInputProps) {
  const [content, setContent] = useState('');
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim() && !isDisabled) {
      onSendMessage(content.trim());
      setContent('');
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      isTypingRef.current = false;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setContent(newValue);

    if (!isDisabled) {
      if (!isTypingRef.current && newValue.length > 0) {
        isTypingRef.current = true;
        onStartTyping?.();
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
        onStopTyping?.();
      }, 2000);
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="p-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-t border-slate-200/50 dark:border-white/10">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex gap-3">
        <input
          type="text"
          value={content}
          onChange={handleChange}
          placeholder="Type a message..."
          disabled={isDisabled}
          className="flex-1 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-900 dark:text-slate-50 transition-all duration-300 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!content.trim() || isDisabled}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-slate-400 text-white w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-lg shadow-blue-500/30 active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </form>
    </div>
  );
}
