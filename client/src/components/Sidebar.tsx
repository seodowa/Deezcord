import { useState, useRef, useEffect } from 'react';
import AsyncButton from './AsyncButton';
import type { Room, Channel } from '../types/room';
import UserProfileModal from './UserProfileModal';
import { useAuth } from '../hooks/useAuth';

export interface SidebarProps {
  rooms: Room[];
  channels?: Channel[];
  currentRoomId?: string;
  currentChannelId?: string;
  isDarkMode: boolean;
  mounted: boolean;
  isOpen: boolean;
  userRole?: string | null;
  onToggleTheme: () => void;
  onLogout: () => void;
  onClose: () => void;
  onSelectRoom: (room: Room) => void;
  onSelectChannel: (channel: Channel) => void;
  onCreateRoom: () => void;
  onCreateChannel: (name: string) => void;
  onDiscoverRoom: () => void;
  isLoadingRooms: boolean;
  isCreatingRoom: boolean;
  isCreatingChannel?: boolean;
}

/* ── Tiny Tooltip ── */
function Tooltip({ text, targetRef, show }: { text: string; targetRef: React.RefObject<HTMLElement | null>; show: boolean }) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (show && targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      setPos({ top: rect.top + rect.height / 2, left: rect.right + 12 });
    }
  }, [show, targetRef]);

  if (!show) return null;

  return (
    <div
      className="fixed z-[200] px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold shadow-xl pointer-events-none whitespace-nowrap animate-tooltip-in"
      style={{ top: pos.top, left: pos.left, transform: 'translateY(-50%)' }}
    >
      {text}
      <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 rotate-45 bg-slate-900 dark:bg-slate-100" />
    </div>
  );
}

/* ── Room Icon (for the rail) ── */
function RoomIcon({ room, isActive, onClick }: { room: Room; isActive: boolean; onClick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <div className="relative flex items-center group w-full justify-center py-[3px]">
        {/* Pill indicator */}
        <div
          className={`absolute left-0 w-1 rounded-r-full bg-slate-900 dark:bg-white transition-all duration-300 ${
            isActive ? 'h-9' : hovered ? 'h-5' : 'h-0'
          }`}
        />
        <button
          ref={ref}
          onClick={onClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={`w-12 h-12 flex-shrink-0 flex items-center justify-center font-bold text-sm transition-all duration-300 overflow-hidden ${
            isActive
              ? 'rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 scale-100'
              : 'rounded-[24px] hover:rounded-2xl bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-indigo-500 hover:text-white hover:shadow-lg hover:shadow-indigo-500/20'
          }`}
          aria-label={room.name}
        >
          {room.room_profile ? (
            <img src={room.room_profile} alt={room.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-base">{room.name.charAt(0).toUpperCase()}</span>
          )}
        </button>
      </div>
      <Tooltip text={room.name} targetRef={ref} show={hovered} />
    </>
  );
}

export default function Sidebar({
  rooms,
  channels = [],
  currentRoomId,
  currentChannelId,
  isDarkMode,
  mounted,
  isOpen,
  userRole,
  onToggleTheme,
  onLogout,
  onClose,
  onSelectRoom,
  onSelectChannel,
  onCreateRoom,
  onCreateChannel,
  onDiscoverRoom,
  isLoadingRooms,
  isCreatingRoom,
  isCreatingChannel
}: SidebarProps) {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCreatingChannelMode, setIsCreatingChannelMode] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [isChannelsCategoryOpen, setIsChannelsCategoryOpen] = useState(true);
  const { user } = useAuth();

  const createBtnRef = useRef<HTMLButtonElement>(null);
  const [createHovered, setCreateHovered] = useState(false);
  const discoverBtnRef = useRef<HTMLButtonElement>(null);
  const [discoverHovered, setDiscoverHovered] = useState(false);

  const currentRoom = rooms.find(r => r.id === currentRoomId);

  const handleCreateChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    await onCreateChannel(newChannelName);
    setIsCreatingChannelMode(false);
    setNewChannelName('');
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={onClose}
          aria-label="Close Sidebar"
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 flex md:relative transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 flex-shrink-0`}
      >
        {/* ═══════════════ COLUMN 1: Room Rail ═══════════════ */}
        <div className="w-[72px] flex flex-col items-center bg-slate-100/90 dark:bg-slate-950/90 backdrop-blur-xl py-3 flex-shrink-0 border-r border-slate-200/30 dark:border-white/5">

          {/* Deezcord logo */}
          <div className="relative flex items-center justify-center w-full py-[3px] mb-1">
            <button
              onClick={() => { /* Could navigate to home / deselect room */ }}
              className="w-12 h-12 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center transition-all duration-300 shadow-md shadow-indigo-500/20 hover:rounded-xl group"
            >
              <svg className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.73 4.87l-3.03-.64a.49.49 0 00-.55.33c-.13.39-.31.87-.43 1.25a18.24 18.24 0 00-5.44 0c-.12-.39-.3-.86-.44-1.25a.48.48 0 00-.55-.33l-3.03.64a.49.49 0 00-.34.37 19.8 19.8 0 00-1.6 8.07c0 .02 0 .04.01.05a18.86 18.86 0 005.65 2.85.49.49 0 00.52-.17c.44-.6.83-1.23 1.17-1.89a.48.48 0 00-.26-.67 12.4 12.4 0 01-1.77-.84.49.49 0 01-.05-.8c.12-.09.24-.18.35-.27a.46.46 0 01.49-.05 13.39 13.39 0 0011.36 0 .46.46 0 01.5.05c.11.09.23.19.35.28a.49.49 0 01-.04.79c-.57.33-1.16.62-1.78.85a.48.48 0 00-.25.67c.35.66.74 1.29 1.17 1.89a.48.48 0 00.52.17 18.81 18.81 0 005.66-2.85.49.49 0 00.01-.06 19.7 19.7 0 00-1.61-8.07.49.49 0 00-.33-.36zM8.68 14.57c-1.02 0-1.86-.93-1.86-2.08s.82-2.08 1.86-2.08 1.88.94 1.86 2.08c0 1.15-.83 2.08-1.86 2.08zm6.64 0c-1.02 0-1.86-.93-1.86-2.08s.82-2.08 1.86-2.08 1.88.94 1.86 2.08c0 1.15-.82 2.08-1.86 2.08z" />
              </svg>
            </button>
          </div>

          {/* Divider */}
          <div className="w-8 h-[2px] rounded-full bg-slate-300/60 dark:bg-white/10 my-1" />

          {/* Room Icons Scrollable */}
          <div className="flex-1 w-full overflow-y-auto overflow-x-hidden scrollbar-none flex flex-col items-center gap-0.5 py-1">
            {isLoadingRooms ? (
              <div className="space-y-2 animate-pulse pt-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-12 h-12 rounded-[24px] bg-slate-200 dark:bg-slate-700" />
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

          {/* Divider */}
          <div className="w-8 h-[2px] rounded-full bg-slate-300/60 dark:bg-white/10 my-1" />

          {/* Action Buttons */}
          <div className="flex flex-col items-center gap-1 pb-1">
            {/* Create Room */}
            <div className="relative flex items-center justify-center w-full py-[3px]">
              <AsyncButton
                ref={createBtnRef}
                onClick={onCreateRoom}
                isLoading={isCreatingRoom}
                onMouseEnter={() => setCreateHovered(true)}
                onMouseLeave={() => setCreateHovered(false)}
                className="w-12 h-12 rounded-[24px] hover:rounded-2xl bg-slate-200/80 dark:bg-slate-700/80 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/20"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </AsyncButton>
            </div>
            <Tooltip text="Create Room" targetRef={createBtnRef} show={createHovered} />

            {/* Discover */}
            <div className="relative flex items-center justify-center w-full py-[3px]">
              <button
                ref={discoverBtnRef}
                onClick={onDiscoverRoom}
                onMouseEnter={() => setDiscoverHovered(true)}
                onMouseLeave={() => setDiscoverHovered(false)}
                className="w-12 h-12 rounded-[24px] hover:rounded-2xl bg-slate-200/80 dark:bg-slate-700/80 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/20"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
            <Tooltip text="Discover Rooms" targetRef={discoverBtnRef} show={discoverHovered} />
          </div>
        </div>

        {/* ═══════════════ COLUMN 2: Channel Panel ═══════════════ */}
        <div className="w-60 flex flex-col bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200/30 dark:border-white/5">

          {/* Panel Header */}
          <div className="h-[52px] flex items-center justify-between px-4 border-b border-slate-200/40 dark:border-white/5 flex-shrink-0 shadow-sm shadow-slate-200/20 dark:shadow-none">
            {currentRoom ? (
              <h2 className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100 truncate tracking-tight">
                {currentRoom.name}
              </h2>
            ) : (
              <h2 className="text-[15px] font-extrabold text-indigo-500 dark:text-indigo-400 tracking-tight">
                Deezcord
              </h2>
            )}

            <div className="flex items-center gap-1">
              {/* Close button (mobile) */}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors md:hidden text-slate-400"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Channel List */}
          <div className="flex-1 overflow-y-auto px-2 pt-4 pb-2 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-300/50 dark:scrollbar-thumb-slate-700/50">
            {currentRoomId && channels.length > 0 ? (
              <>
                {/* Collapsible Category Header */}
                <button
                  onClick={() => setIsChannelsCategoryOpen(!isChannelsCategoryOpen)}
                  className="flex items-center gap-0.5 w-full px-1 mb-1 group"
                >
                  <svg
                    className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isChannelsCategoryOpen ? 'rotate-0' : '-rotate-90'}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                    Text Channels
                  </span>
                  {userRole === 'owner' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsCreatingChannelMode(!isCreatingChannelMode); }}
                      className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors opacity-0 group-hover:opacity-100"
                      title="Create Channel"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  )}
                </button>

                {/* Create Channel Form */}
                {isCreatingChannelMode && userRole === 'owner' && (
                  <form onSubmit={handleCreateChannelSubmit} className="px-1 mb-2 animate-slide-down">
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-white/5 rounded-md overflow-hidden focus-within:ring-2 ring-indigo-500/40 transition-shadow">
                      <span className="pl-2 text-slate-400 text-sm">#</span>
                      <input
                        type="text"
                        value={newChannelName}
                        onChange={e => setNewChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                        className="w-full bg-transparent text-sm py-1.5 px-1.5 outline-none text-slate-800 dark:text-white placeholder-slate-400"
                        placeholder="new-channel"
                        autoFocus
                      />
                    </div>
                    <div className="flex justify-end mt-1.5 gap-2">
                      <button type="button" onClick={() => setIsCreatingChannelMode(false)} className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                        Cancel
                      </button>
                      <button type="submit" disabled={isCreatingChannel || !newChannelName} className="text-[11px] bg-indigo-500 text-white px-2.5 py-0.5 rounded hover:bg-indigo-600 disabled:opacity-40 transition-colors font-semibold">
                        Create
                      </button>
                    </div>
                  </form>
                )}

                {/* Channel Items */}
                <div className={`space-y-[1px] overflow-hidden transition-all duration-300 ${isChannelsCategoryOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  {channels.map(channel => (
                    <button
                      key={channel.id}
                      onClick={() => onSelectChannel(channel)}
                      className={`w-full text-left rounded-md transition-all duration-150 flex items-center px-2 py-[6px] gap-1.5 group/ch ${
                        currentChannelId === channel.id
                          ? 'bg-slate-200/70 dark:bg-slate-700/70 text-slate-900 dark:text-white'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <svg className={`w-5 h-5 flex-shrink-0 transition-colors ${currentChannelId === channel.id ? 'text-slate-500 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                      </svg>
                      <span className={`truncate text-[15px] ${currentChannelId === channel.id ? 'font-semibold' : 'font-medium'}`}>
                        {channel.name}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : !currentRoomId ? (
              /* No room selected state */
              <div className="flex flex-col items-center justify-center h-full text-center px-4 opacity-60">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Select a room to view channels</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Pick a server from the rail</p>
              </div>
            ) : (
              /* Room selected but no channels */
              <div className="flex flex-col items-center justify-center h-full text-center px-4 opacity-60">
                <p className="text-sm text-slate-500 dark:text-slate-400">No channels yet</p>
              </div>
            )}
          </div>

          {/* User Panel Footer */}
          <div className="h-[52px] flex items-center gap-2 px-2 border-t border-slate-200/40 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/50 flex-shrink-0">
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-2 flex-1 min-w-0 p-1 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors group"
            >
              <div className="relative flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs overflow-hidden shadow-sm">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span>{(user?.username || user?.email || 'U').substring(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-950" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">
                  {user?.username || user?.email?.split('@')[0]}
                </p>
                <p className="text-[10px] text-emerald-500 font-medium leading-tight">
                  Online
                </p>
              </div>
            </button>

            {/* Quick Actions */}
            <div className="flex items-center gap-0.5">
              {mounted && (
                <button
                  onClick={onToggleTheme}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all"
                  title={isDarkMode ? 'Light mode' : 'Dark mode'}
                >
                  {isDarkMode ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="5" />
                      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                  )}
                </button>
              )}
              <AsyncButton
                onClick={onLogout}
                className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                title="Sign Out"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </AsyncButton>
            </div>
          </div>
        </div>
      </div>

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
}