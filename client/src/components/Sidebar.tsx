import { useState, memo } from 'react';
import AsyncButton from './AsyncButton';
import SocialSection from '../pages/home/components/SocialSection';
import type { Room, Channel } from '../types/room';
import type { User } from '../types/user';
import { useAuth } from '../hooks/useAuth';
import Modal from './Modal';

// Sub-components
import Rail from './sidebar/Rail';
import ChannelList from './sidebar/ChannelList';
import UserFooter from './sidebar/UserFooter';

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
  onDeleteChannel?: (channelId: string) => void;
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
  onDeleteChannel,
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
  const [isDeletingChannel, setIsDeletingChannel] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);
  const { user } = useAuth();

  const currentRoom = rooms.find(r => r.id === currentRoomId);

  const handleConfirmDeleteChannel = async () => {
    if (!channelToDelete || !onDeleteChannel) return;
    setIsDeletingChannel(true);
    try {
      await onDeleteChannel(channelToDelete.id);
      setChannelToDelete(null);
    } finally {
      setIsDeletingChannel(false);
    }
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

      {/* Channel Deletion Confirmation Modal */}
      <Modal
        isOpen={!!channelToDelete}
        onClose={() => setChannelToDelete(null)}
        title="Delete Channel"
        description={`Are you sure you want to delete "#${channelToDelete?.name}"? This action cannot be undone and all messages will be permanently removed.`}
        isLoading={isDeletingChannel}
        footer={
          <>
            <button
              onClick={() => setChannelToDelete(null)}
              className="px-6 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <AsyncButton
              onClick={handleConfirmDeleteChannel}
              isLoading={isDeletingChannel}
              className="px-6 py-2.5 rounded-xl bg-red-500 text-white font-bold shadow-lg shadow-red-500/25 hover:bg-red-600 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              Delete Channel
            </AsyncButton>
          </>
        }
      >
        <div className="flex flex-col items-center justify-center py-4">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <p className="text-center text-slate-600 dark:text-slate-300 font-medium">
            You are about to delete <span className="font-bold text-slate-900 dark:text-white">#{channelToDelete?.name}</span>.
          </p>
        </div>
      </Modal>

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex md:relative transition-all duration-300 ease-expo ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 ${isCollapsed ? 'w-17' : 'w-78'} h-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-r border-slate-200/50 dark:border-white/5 shrink-0 overflow-hidden`}
      >
        {/* ── UNIFIED RAIL (Utility Area) ── */}
        <Rail 
          rooms={rooms}
          currentRoomId={currentRoomId}
          isLoadingRooms={isLoadingRooms}
          isCreatingRoom={isCreatingRoom}
          isSocialOpen={isSocialOpen}
          isWelcomeMode={isWelcomeMode}
          isCollapsed={isCollapsed}
          isDiscoveryMode={isDiscoveryMode}
          isHomeDashboard={isHomeDashboard}
          onHomeClick={onHomeClick}
          onSelectRoom={onSelectRoom}
          onToggleSocial={onToggleSocial}
          onCreateRoom={onCreateRoom}
          onDiscoverRoom={onDiscoverRoom}
        />
        
        {/* ── SECONDARY PANEL AREA (Channels, DMs, or Social Overlay) ── */}
        <div className={`flex-1 relative flex flex-col min-w-0 transition-all duration-300 ${
          (isCollapsed && !isSocialOpen) 
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
                  onClose={onToggleSocial}
                />
              )}
            </div>
          )}

          {isWelcomeMode ? (
            /* Social Sidebar for Home/DM/Discovery Views */
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
                onClose={onClose}
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
              <ChannelList 
                channels={channels}
                currentChannelId={currentChannelId}
                userRole={userRole}
                onSelectChannel={onSelectChannel}
                onCreateChannel={onCreateChannel}
                onDeleteChannelRequest={(channel) => setChannelToDelete(channel)}
                isCreatingChannel={isCreatingChannel}
                currentRoomId={currentRoomId}
              />

              {/* User Footer Panel */}
              <UserFooter 
                user={user}
                mounted={mounted}
                isDarkMode={isDarkMode}
                onToggleTheme={onToggleTheme}
                onLogout={onLogout}
                onOpenProfile={onOpenProfile}
              />
            </>
          )}
        </div>
      </aside>
    </>
  );
}

export default memo(SidebarComponent);
