import React, { useState, useRef, useEffect, memo } from 'react';
import { uploadFile } from '../services/fileService';
import { useToast } from '../hooks/useToast';
import AsyncButton from './AsyncButton';

interface MessageInputProps {
  onSendMessage: (content: string, fileUrl?: string, fileName?: string, parentId?: string | null, fileWidth?: number, fileHeight?: number) => void;
  onStartTyping?: () => void;
  onStopTyping?: () => void;
  isDisabled?: boolean;
  roomId?: string;
  channelId?: string;
  externalFile?: File | null;
  onClearExternalFile?: () => void;
  replyTo?: { id: string; username: string; content: string } | null;
  onClearReply?: () => void;
}

function MessageInputComponent({ 
  onSendMessage, 
  onStartTyping, 
  onStopTyping, 
  isDisabled,
  roomId,
  channelId,
  externalFile,
  onClearExternalFile,
  replyTo,
  onClearReply
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (externalFile) {
      // Defer state update to avoid cascading renders warning
      const timeoutId = setTimeout(() => {
        setSelectedFile(externalFile);
        onClearExternalFile?.();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [externalFile, onClearExternalFile]);

  useEffect(() => {
    if (replyTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyTo]);

  const getFileDimensions = (file: File): Promise<{ width: number; height: number } | null> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(null);
        return;
      }
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => {
        resolve(null);
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((content.trim() || selectedFile) && !isDisabled && !isUploading) {
      setIsUploading(true);
      try {
        let fileUrl = undefined;
        let fileName = undefined;
        let fileWidth = undefined;
        let fileHeight = undefined;
        if (selectedFile && roomId && channelId) {
          fileName = selectedFile.name;
          
          const dimensions = await getFileDimensions(selectedFile);
          if (dimensions) {
            fileWidth = dimensions.width;
            fileHeight = dimensions.height;
          }
          
          fileUrl = await uploadFile(roomId, channelId, selectedFile);
        }
        
        onSendMessage(content.trim(), fileUrl, fileName, replyTo?.id, fileWidth, fileHeight);
        setContent('');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        isTypingRef.current = false;
      } catch (error: unknown) {
        const err = error as Error;
        addToast(err.message || 'Failed to upload file', 'error');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        addToast('File size must be less than 5MB', 'error');
        e.target.value = '';
        return;
      }
      setSelectedFile(file);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (isDisabled || isUploading) return;
    
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          if (file.size > 5 * 1024 * 1024) {
            addToast('File size must be less than 5MB', 'error');
            return;
          }
          setSelectedFile(file);
          addToast('Image pasted from clipboard', 'info');
          break;
        }
      }
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
    <div className="p-5 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-t border-slate-200/50 dark:border-white/10 relative">
      <div className="max-w-4xl mx-auto">
        {replyTo && (
          <div className="mb-3 flex items-center justify-between gap-4 px-4 py-2 bg-slate-100 dark:bg-slate-800 border-l-4 border-blue-500 rounded-lg animate-fade-in-up">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h10a8 8 0 018 8v2M3 10l5 5m-5-5l5-5" />
                </svg>
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Replying to {replyTo.username}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate italic">
                "{replyTo.content}"
              </p>
            </div>
            <button 
              type="button"
              onClick={onClearReply}
              className="w-6 h-6 rounded-full flex items-center justify-center bg-slate-200 dark:bg-slate-700 text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {selectedFile && (
          <div className="mb-2 flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 w-fit animate-fade-in">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <span className="truncate max-w-[200px]">{selectedFile.name}</span>
            <button 
              type="button"
              onClick={removeSelectedFile}
              className="hover:text-blue-800 dark:hover:text-blue-200 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          
          <button
            type="button"
            disabled={isDisabled || isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/10 text-slate-500 dark:text-slate-400 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          <input
            type="text"
            ref={inputRef}
            value={content}
            onChange={handleChange}
            onPaste={handlePaste}
            placeholder={isUploading ? "Uploading file..." : (replyTo ? `Reply to ${replyTo.username}...` : "Type a message...")}
            disabled={isDisabled || isUploading}
            className="flex-1 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-900 dark:text-slate-50 transition-all duration-300 disabled:opacity-50"
          />
          
          <AsyncButton
            type="submit"
            disabled={(!content.trim() && !selectedFile) || isDisabled}
            isLoading={isUploading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-slate-400 text-white w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-lg shadow-blue-500/30 active:scale-95 shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </AsyncButton>
        </form>
      </div>
    </div>
  );
}

export default memo(MessageInputComponent);
