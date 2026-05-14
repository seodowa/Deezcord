import { useRef, useState } from 'react';
import Logo from '../Logo';
import AsyncButton from '../AsyncButton';
import RoomIcon from './RoomIcon';
import Tooltip from './Tooltip';
import type { Room } from '../../types/room';

interface RailProps {
  rooms: Room[];
  currentRoomId?: string;
  isLoadingRooms: boolean;
  isCreatingRoom: boolean;
  isSocialOpen: boolean;
  isWelcomeMode: boolean;
  isCollapsed: boolean;
  isDiscoveryMode: boolean;
  isHomeDashboard: boolean;
  onHomeClick: () => void;
  onSelectRoom: (room: Room) => void;
  onToggleSocial?: () => void;
  onCreateRoom: () => void;
  onDiscoverRoom: () => void;
}

export default function Rail({
  rooms,
  currentRoomId,
  isLoadingRooms,
  isCreatingRoom,
  isSocialOpen,
  isWelcomeMode,
  isCollapsed,
  isDiscoveryMode,
  isHomeDashboard,
  onHomeClick,
  onSelectRoom,
  onToggleSocial,
  onCreateRoom,
  onDiscoverRoom
}: RailProps) {
  const createBtnRef = useRef<HTMLButtonElement>(null);
  const [createHovered, setCreateHovered] = useState(false);
  const discoverBtnRef = useRef<HTMLButtonElement>(null);
  const [discoverHovered, setDiscoverHovered] = useState(false);
  const socialBtnRef = useRef<HTMLButtonElement>(null);
  const [socialHovered, setSocialHovered] = useState(false);

  return (
    <div className="relative z-30 w-17 flex flex-col items-center py-4 shrink-0 bg-white dark:bg-slate-900 h-full border-r border-slate-200/30 dark:border-white/5 shadow-xl">
      {/* Brand Mark */}
      <button
        type="button"
        onClick={onHomeClick}
        className={`relative w-12 h-12 flex items-center justify-center mb-6 group cursor-pointer transition-transform hover:scale-105 active:scale-95 ${
          !currentRoomId ? 'ring-2 ring-indigo-500 rounded-xl ring-offset-2 dark:ring-offset-slate-900' : ''
        }`}
      >
        <Logo className="w-9 h-9" />
      </button>

      <div className="flex-1 w-full overflow-y-auto scrollbar-none flex flex-col items-center gap-1">
        {isLoadingRooms ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-11 h-11 rounded-2xl bg-slate-200 dark:bg-white/5" />
            ))}
          </div>
        ) : (
          rooms.map(room => (
            <RoomIcon
              key={room.id}
              room={room}
              isActive={currentRoomId === room.id}
              onClick={() => onSelectRoom(room)}
            />
          ))
        )}
      </div>

      {/* Action Area */}
      <div className="flex flex-col items-center gap-3 pt-4 border-t border-slate-200/50 dark:border-white/10 w-full mt-auto">
        {/* Social Toggle Button */}
        <div className={`relative ${(isDiscoveryMode || isHomeDashboard) ? '2xl:hidden' : ''}`}>
          <button
            type="button"
            ref={socialBtnRef}
            onClick={onToggleSocial}
            onMouseEnter={() => setSocialHovered(true)}
            onMouseLeave={() => setSocialHovered(false)}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 ${
              (isSocialOpen || (isWelcomeMode && !isCollapsed))
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white'
            } cursor-pointer`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </button>
          <Tooltip text="Friends & Social" targetRef={socialBtnRef} show={socialHovered} />
        </div>
        <div className="relative">
          <AsyncButton
            type="button"
            ref={createBtnRef}
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              await onCreateRoom();
            }}
            isLoading={isCreatingRoom}
            onMouseEnter={() => setCreateHovered(true)}
            onMouseLeave={() => setCreateHovered(false)}
            className="w-11 h-11 rounded-2xl flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all duration-200 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </AsyncButton>
          <Tooltip text="Create Room" targetRef={createBtnRef} show={createHovered} />
        </div>

        <div className="relative">
          <button
            type="button"
            ref={discoverBtnRef}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDiscoverRoom();
            }}
            onMouseEnter={() => setDiscoverHovered(true)}
            onMouseLeave={() => setDiscoverHovered(false)}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 bg-slate-200/50 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-indigo-500 hover:text-white cursor-pointer`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <Tooltip text="Discover" targetRef={discoverBtnRef} show={discoverHovered} />
        </div>
      </div>
    </div>
  );
}
