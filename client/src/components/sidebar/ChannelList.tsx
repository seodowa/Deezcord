import { useState, useEffect } from 'react';
import AsyncButton from '../AsyncButton';
import type { Channel } from '../../types/room';

interface ChannelListProps {
  channels: Channel[];
  currentChannelId?: string;
  userRole?: string | null;
  onSelectChannel: (channel: Channel) => void;
  onCreateChannel: (name: string) => void;
  onDeleteChannelRequest: (channel: Channel) => void;
  isCreatingChannel?: boolean;
  currentRoomId?: string;
}

export default function ChannelList({
  channels,
  currentChannelId,
  userRole,
  onSelectChannel,
  onCreateChannel,
  onDeleteChannelRequest,
  isCreatingChannel,
  currentRoomId
}: ChannelListProps) {
  const [isCreatingChannelMode, setIsCreatingChannelMode] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [isChannelsCategoryOpen, setIsChannelsCategoryOpen] = useState(true);

  // Reset local state when room changes
  useEffect(() => {
    setIsCreatingChannelMode(false);
    setNewChannelName('');
  }, [currentRoomId]);

  const handleCreateChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    await onCreateChannel(newChannelName);
    setIsCreatingChannelMode(false);
    setNewChannelName('');
  };

  return (
    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
      {currentRoomId && (
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 mb-2 group">
            <button
              onClick={() => setIsChannelsCategoryOpen(!isChannelsCategoryOpen)}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <svg
                className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isChannelsCategoryOpen ? 'rotate-0' : '-rotate-90'}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Channels
              </span>
            </button>

            {userRole === 'owner' && (
              <button
                onClick={() => setIsCreatingChannelMode(!isCreatingChannelMode)}
                className="p-1 text-slate-400 hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>

          {isCreatingChannelMode && (
            <form onSubmit={handleCreateChannelSubmit} className="px-2 mb-4 animate-in slide-in-from-top-2 duration-200">
              <div className="relative flex items-center bg-slate-100/50 dark:bg-white/5 rounded-xl border border-slate-200/50 dark:border-white/10 p-1">
                <span className="pl-3 pr-1 text-slate-400 text-sm font-bold">#</span>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={e => setNewChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  className="w-full bg-transparent text-sm py-2 px-1 outline-none text-slate-800 dark:text-white placeholder-slate-400"
                  placeholder="new-channel"
                  autoFocus
                />
                <div className="flex items-center gap-1">
                  <button 
                    type="button" 
                    onClick={() => setIsCreatingChannelMode(false)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                    title="Cancel"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <button 
                    type="submit" 
                    disabled={isCreatingChannel || !newChannelName} 
                    className="p-1.5 bg-indigo-500 text-white rounded-lg disabled:opacity-50 hover:bg-indigo-600 transition-colors cursor-pointer"
                    title="Create"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className={`space-y-0.5 transition-all duration-300 ${isChannelsCategoryOpen ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
            {channels.map(channel => (
              <div key={channel.id} className="relative group/channel">
                <AsyncButton
                  onClick={async () => {
                    await new Promise(resolve => setTimeout(resolve, 300));
                    onSelectChannel(channel);
                  }}
                  className={`w-full flex items-center justify-start! gap-3 px-3 py-2.5 rounded-xl transition-all duration-500 ${
                    channel.isNew ? 'animate-slide-down bg-indigo-500/5 ring-1 ring-indigo-500/20 shadow-sm' : ''
                  } ${
                    currentChannelId === channel.id
                      ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                  } cursor-pointer`}
                >
                  <span className={`text-lg transition-colors ${currentChannelId === channel.id ? 'text-indigo-500' : 'text-slate-300 group-hover:text-slate-400'}`}>#</span>
                  <span className={`text-[15px] truncate ${currentChannelId === channel.id ? 'font-bold' : 'font-medium'}`}>
                    {channel.name}
                  </span>
                </AsyncButton>

                {userRole === 'owner' && channels.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChannelRequest(channel);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover/channel:opacity-100 transition-all duration-200 cursor-pointer"
                    title="Delete Channel"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
