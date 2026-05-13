import { useState, useRef, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import AsyncButton from './AsyncButton';
import Logo from './Logo';
import SocialSection from '../pages/home/components/SocialSection';
import type { Room, Channel } from '../types/room';
import type { User } from '../types/user';
import { useAuth } from '../hooks/useAuth';

export interface SidebarProps {
  rooms: Room[];
  dms?: Room[];
  channels?: Channel[];
  currentRoomId?: string;
  currentChannelId?: string;
  isDarkMode: boolean;
  mounted: boolean;
  isOpen: boolean;
  isCollapsed?: boolean;
  userRole?: string | null;
  onToggleTheme: () => void;
  onLogout: () => Promise<void>;
  onClose: () => void;
  onHomeClick: () => void;
  onSelectRoom: (room: Room) => void;
  onSelectChannel: (channel: Channel) => void;
  onCreateRoom: () => void;
  onCreateChannel: (name: string) => void;
  onDiscoverRoom: () => void;
  onOpenProfile: () => void;
  isLoadingRooms: boolean;
  isCreatingRoom: boolean;
  isCreatingChannel?: boolean;
  isDiscoveryMode?: boolean;
  isWelcomeMode?: boolean;
  isHomeDashboard?: boolean;
  // Social Drawer Props
  isSocialOpen?: boolean;
  onToggleSocial?: () => void;
  social?: {
    friendsList: User[];
    pendingList: User[];
    isLoadingFriends: boolean;
    handleAcceptRequest: (id: string) => Promise<void>;
    handleDeclineRequest: (id: string) => Promise<void>;
    handleUserClick: (user: { id: string; username: string; avatar_url?: string | null }) => void;
    activeSidebarTab: 'friends' | 'search';
    setActiveSidebarTab: (tab: 'friends' | 'search') => void;
    handleUserSearch: (query: string) => void;
    searchResults: User[];
    isSearching: boolean;
    searchQuery: string;
  };
  isLoadingDMs?: boolean;
  onMessageClick?: (user: { id: string; username: string; avatar_url?: string | null }) => void;
  onDMClick?: (dm: Room) => void;
  onNavigate?: (path: string) => void;
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

  return createPortal(
    <div
      className="fixed z-9999 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold shadow-xl pointer-events-none whitespace-nowrap animate-tooltip-in"
      style={{ top: pos.top, left: pos.left, transform: 'translateY(-50%)' }}
    >
      {text}
      <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 rotate-45 bg-slate-900 dark:bg-slate-100" />
    </div>,
    document.body
  );
}

/* ── Room Icon (Unified Rail) ── */
function RoomIcon({ room, isActive, onClick }: { room: Room; isActive: boolean; onClick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);

  const handleClick = async () => {
    // Add a slight delay to prevent rapid-fire switches and show the loading state
    await new Promise(resolve => setTimeout(resolve, 300));
    onClick();
  };

  return (
    <>
      <div className="relative flex items-center group w-full justify-center py-1.5">
        {/* Modern Indicator: Subtle background pill instead of side-stripe */}
        {isActive && (
          <div className="absolute inset-x-2 inset-y-0.5 bg-indigo-500/10 dark:bg-indigo-400/10 rounded-2xl transition-all duration-300" />
        )}
        
        <AsyncButton
          ref={ref}
          onClick={handleClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={`relative w-11 h-11 shrink-0 flex items-center justify-center font-bold text-sm transition-all duration-300 overflow-hidden ${
                      isActive
                        ? 'rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 scale-100'
                        : 'rounded-2xl bg-slate-200/50 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-indigo-500 dark:hover:text-indigo-400'
                    } cursor-pointer`}
          aria-label={room.name}
        >
          {room.room_profile ? (
            <img src={room.room_profile} alt={room.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-base">{room.name.charAt(0).toUpperCase()}</span>
          )}
        </AsyncButton>
      </div>
      <Tooltip text={room.name} targetRef={ref} show={hovered} />
    </>
  );
}

function SidebarComponent({
  rooms,
  dms = [],
  channels = [],
  currentRoomId,
  currentChannelId,
  isDarkMode,
  mounted,
  isOpen,
  isCollapsed = false,
  userRole,
  onToggleTheme,
  onLogout,
  onClose,
  onHomeClick,
  onSelectRoom,
  onSelectChannel,
  onCreateRoom,
  onCreateChannel,
  onDiscoverRoom,
  onOpenProfile,
  isLoadingRooms,
  isCreatingRoom,
  isCreatingChannel,
  isDiscoveryMode = false,
  isWelcomeMode = false,
  isHomeDashboard = false,
  // Social Drawer Props
  isSocialOpen = false,
  onToggleSocial,
  social,
  isLoadingDMs = false,
  onMessageClick,
  onDMClick,
  onNavigate
}: SidebarProps) {
  const [isCreatingChannelMode, setIsCreatingChannelMode] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [isChannelsCategoryOpen, setIsChannelsCategoryOpen] = useState(true);
  const { user } = useAuth();

  const createBtnRef = useRef<HTMLButtonElement>(null);
  const [createHovered, setCreateHovered] = useState(false);
  const discoverBtnRef = useRef<HTMLButtonElement>(null);
  const [discoverHovered, setDiscoverHovered] = useState(false);
  const socialBtnRef = useRef<HTMLButtonElement>(null);
  const [socialHovered, setSocialHovered] = useState(false);

  const currentRoom = rooms.find(r => r.id === currentRoomId);

  const [prevRoomId, setPrevRoomId] = useState(currentRoomId);
  if (currentRoomId !== prevRoomId) {
    setIsCreatingChannelMode(false);
    setNewChannelName('');
    setPrevRoomId(currentRoomId);
  }

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
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 cursor-pointer"
          onClick={onClose}
          aria-label="Close Sidebar"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex md:relative transition-all duration-300 ease-expo ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 ${isCollapsed ? 'w-17' : 'w-78'} h-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-r border-slate-200/50 dark:border-white/5 shrink-0 overflow-hidden`}
      >
        {/* ── UNIFIED RAIL (Utility Area) ── */}
        <div className="w-17 flex flex-col items-center py-4 shrink-0 bg-slate-900/5 dark:bg-white/5 h-full border-r border-slate-200/30 dark:border-white/5">
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
          <div className={`flex flex-col items-center gap-3 pt-4 border-t border-slate-200/50 dark:border-white/10 w-full mt-auto ${isHomeDashboard ? 'border-t-0' : ''}`}>
            {!isHomeDashboard && (
              <>
                {/* Social Toggle Button */}
                {!isDiscoveryMode && (
                  <div className="relative">
                    <button
                      type="button"
                      ref={socialBtnRef}
                      onClick={onToggleSocial}
                      onMouseEnter={() => setSocialHovered(true)}
                      onMouseLeave={() => setSocialHovered(false)}
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                                              (isSocialOpen || (isWelcomeMode && !isHomeDashboard))
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
                )}

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
              </>
            )}

            {!isHomeDashboard && !isDiscoveryMode && (
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
            )}
          </div>
        </div>
        
        {/* ── SECONDARY PANEL AREA (Channels, DMs, or Social Overlay) ── */}
        <div className={`flex-1 relative flex flex-col min-w-0 transition-all duration-300 ${
          isCollapsed && !isSocialOpen 
            ? 'opacity-0 invisible hidden' 
            : 'opacity-100 visible'
        }`}>
          {/* Social Drawer Overlay - Only shown as overlay in Room views */}
          {!isWelcomeMode && (
            <div 
              className={`absolute inset-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl transition-all duration-500 ease-expo transform ${
                isSocialOpen ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-12 opacity-0 pointer-events-none'
              }`}
            >
              {social && (
                <SocialSection 
                  user={user}
                  onLogout={onLogout}
                  onOpenProfile={onOpenProfile}
                  friendsList={social.friendsList}
                  pendingList={social.pendingList}
                  isLoadingFriends={social.isLoadingFriends}
                  onAcceptRequest={social.handleAcceptRequest}
                  onDeclineRequest={social.handleDeclineRequest}
                  onUserClick={social.handleUserClick}
                  onMessageClick={(u) => onMessageClick?.(u)}
                  onNavigate={(path) => onNavigate?.(path)}
                  activeTab={social.activeSidebarTab}
                  onTabChange={social.setActiveSidebarTab}
                  onSearch={social.handleUserSearch}
                  searchResults={social.searchResults}
                  isSearching={social.isSearching}
                  searchQuery={social.searchQuery}
                  dmList={dms}
                  isLoadingDMs={isLoadingDMs}
                  onDMClick={(dm) => onDMClick?.(dm)}
                />
              )}
            </div>
          )}

          {isWelcomeMode ? (
            /* Social Sidebar for Home/DM Views */
            social && (
              <SocialSection 
                user={user}
                onLogout={onLogout}
                onOpenProfile={onOpenProfile}
                friendsList={social.friendsList}
                pendingList={social.pendingList}
                isLoadingFriends={social.isLoadingFriends}
                onAcceptRequest={social.handleAcceptRequest}
                onDeclineRequest={social.handleDeclineRequest}
                onUserClick={social.handleUserClick}
                onMessageClick={(u) => onMessageClick?.(u)}
                onNavigate={(path) => onNavigate?.(path)}
                activeTab={social.activeSidebarTab}
                onTabChange={social.setActiveSidebarTab}
                onSearch={social.handleUserSearch}
                searchResults={social.searchResults}
                isSearching={social.isSearching}
                searchQuery={social.searchQuery}
                dmList={dms}
                isLoadingDMs={isLoadingDMs}
                onDMClick={(dm) => onDMClick?.(dm)}
              />
            )
          ) : (
            <>
              {/* Header */}
              <div className="h-16 md:h-20 flex items-center justify-between px-5 border-b border-slate-200/50 dark:border-white/10">
                <h2 className="text-[17px] font-bold text-slate-900 dark:text-white truncate tracking-tight">
                  {currentRoom?.name || 'Deezcord'}
                </h2>
                
                <div className="flex items-center gap-1 md:hidden">
                  <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* List Section */}
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
                        <AsyncButton
                          key={channel.id}
                          onClick={async () => {
                            await new Promise(resolve => setTimeout(resolve, 300));
                            onSelectChannel(channel);
                          }}
                          className={`w-full group flex items-center justify-start! gap-3 px-3 py-2.5 rounded-xl transition-all duration-500 ${
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
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* User Footer Panel */}
              <div className="py-3 px-4 bg-slate-50/30 dark:bg-black/10">
                <div className="flex items-center justify-between px-3 py-2 rounded-[1.25rem] bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/5 shadow-sm group/profile">
                  <button
                    onClick={onOpenProfile}
                    className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-80 transition-opacity cursor-pointer text-left"
                  >
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-md overflow-hidden ring-2 ring-white/10 transition-transform group-hover/profile:scale-105">
                        {user?.avatar_url ? (
                          <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <span>{(user?.username || user?.email || 'U').substring(0, 1).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800 shadow-sm" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {user?.username || user?.email?.split('@')[0]}
                      </p>
                      <p className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-tighter">
                        Online
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 ml-2">
                    {mounted && (
                      <button
                        onClick={onToggleTheme}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                        title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                      >
                        {isDarkMode ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="5" />
                            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                          </svg>
                        )}
                      </button>
                    )}
                    <AsyncButton
                      onClick={onLogout}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                      title="Logout"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </AsyncButton>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

export default memo(SidebarComponent);
