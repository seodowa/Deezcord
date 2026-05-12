import React, { useState, useRef } from 'react';
import AsyncButton from './AsyncButton';
import Modal from './Modal';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, file: File | null) => Promise<void>;
}

export default function CreateRoomModal({ isOpen, onClose, onCreate }: CreateRoomModalProps) {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      await onCreate(name, file);
      setName('');
      setFile(null);
      setPreview(null);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        disabled={isLoading}
        className="px-6 py-3 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors duration-200 disabled:opacity-50 cursor-pointer"
      >
        Cancel
      </button>
      <AsyncButton
        onClick={(e) => { e.preventDefault(); handleSubmit(e as unknown as React.FormEvent); }}
        disabled={!name.trim()}
        isLoading={isLoading}
        loadingText="Creating..."
        className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_8px_16px_-8px_rgba(59,130,246,1)] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:-translate-y-0 disabled:hover:shadow-none cursor-pointer"
      >
        Create Room
      </AsyncButton>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create a Room"
      description="Give your new room a personality with a name and an optional profile picture."
      footer={footer}
      maxWidth="max-w-md"
      isLoading={isLoading}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Image Upload Area */}
        <div className="flex flex-col items-center justify-center gap-4">
          <div 
            className={`relative w-24 h-24 rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all duration-300 overflow-hidden ${
              preview 
              ? 'border-blue-500 dark:border-blue-400' 
              : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 bg-slate-50 dark:bg-slate-900/50'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            {preview ? (
              <>
                <img src={preview} alt="Room preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1 text-slate-400 dark:text-slate-500">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-[10px] font-bold uppercase tracking-wider">Upload</span>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
          {preview && (
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}
              className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-semibold cursor-pointer"
            >
              Remove Picture
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="roomName" className="text-sm font-bold text-slate-900 dark:text-slate-50 uppercase tracking-wide">
            Room Name <span className="text-red-500">*</span>
          </label>
          <input
            id="roomName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. General Chat"
            maxLength={100}
            required
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-base text-slate-900 dark:text-slate-50 transition-all duration-200 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 dark:focus:ring-blue-400/20"
          />
        </div>
      </form>
    </Modal>
  );
}

