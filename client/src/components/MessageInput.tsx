import React, { useState, useRef, useEffect } from 'react';
import { uploadFile } from '../services/fileService';
import { useToast } from '../hooks/useToast';

interface MessageInputProps {
  onSendMessage: (content: string, fileUrl?: string, fileName?: string) => void;
  onStartTyping?: () => void;
  onStopTyping?: () => void;
  isDisabled?: boolean;
  roomId?: string;
  channelId?: string;
  externalFile?: File | null;
  onClearExternalFile?: () => void;
}

export default function MessageInput({ 
  onSendMessage, 
  onStartTyping, 
  onStopTyping, 
  isDisabled,
  roomId,
  channelId,
  externalFile,
  onClearExternalFile
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (externalFile) {
      setSelectedFile(externalFile);
      onClearExternalFile?.();
    }
  }, [externalFile, onClearExternalFile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((content.trim() || selectedFile) && !isDisabled && !isUploading) {
      setIsUploading(true);
      try {
        let fileUrl = undefined;
        let fileName = undefined;
        if (selectedFile && roomId && channelId) {
          fileName = selectedFile.name;
          fileUrl = await uploadFile(roomId, channelId, selectedFile);
        }
        
        onSendMessage(content.trim(), fileUrl, fileName);
        setContent('');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        isTypingRef.current = false;
      } catch (error: any) {
        addToast(error.message || 'Failed to upload file', 'error');
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
    <div className="p-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-t border-slate-200/50 dark:border-white/10 relative">
      <div className="max-w-4xl mx-auto">
        {selectedFile && (
          <div className="mb-2 flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 w-fit animate-fade-in">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <span className="truncate max-w-[200px]">{selectedFile.name}</span>
            <button 
              onClick={removeSelectedFile}
              className="hover:text-blue-800 dark:hover:text-blue-200"
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
            className="bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/10 text-slate-500 dark:text-slate-400 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          <input
            type="text"
            value={content}
            onChange={handleChange}
            onPaste={handlePaste}
            placeholder={isUploading ? "Uploading file..." : "Type a message..."}
            disabled={isDisabled || isUploading}
            className="flex-1 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-900 dark:text-slate-50 transition-all duration-300 disabled:opacity-50"
          />
          
          <button
            type="submit"
            disabled={(!content.trim() && !selectedFile) || isDisabled || isUploading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-slate-400 text-white w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-lg shadow-blue-500/30 active:scale-95"
          >
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
