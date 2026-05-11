import { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { NavigateFunction } from 'react-router-dom';
import AsyncButton from '../../components/AsyncButton';
import { generateSlug } from '../../utils/slug';
import type { Room } from '../../types/room';
import type { User } from '../../types/user';
import SocialSection from './components/SocialSection';
import MemberProfileModal from '../../components/MemberProfileModal';
import UserProfileModal from '../../components/UserProfileModal';

interface HomeContextType {
  user: User | null;
  rooms: Room[];
  discoverRooms: Room[];
  isLoadingRooms: boolean;
  isLoadingDiscover: boolean;
  fetchDiscoverRooms: () => void;
  joinExistingRoom: (room: Room) => Promise<Room>;
  joiningRoomId: string | null;
  navigate: NavigateFunction;
  onLogout: () => Promise<void>;
  // Lifted Social Context
  social: {
    friendsList: User[];
    pendingList: User[];
    isLoadingFriends: boolean;
    handleAcceptRequest: (id: string) => Promise<void>;
    handleDeclineRequest: (id: string) => Promise<void>;
    handleUserClick: (user: { id: string; username: string; avatar_url?: string | null }) => void;
    setIsUserProfileOpen: (open: boolean) => void;
    isUserProfileOpen: boolean;
    activeSidebarTab: 'friends' | 'search';
    setActiveSidebarTab: (tab: 'friends' | 'search') => void;
    handleUserSearch: (query: string) => void;
    searchResults: User[];
    isSearching: boolean;
    searchQuery: string;
    handleRefreshFriends: () => void;
    isFriendProfileOpen: boolean;
    setIsFriendProfileOpen: (open: boolean) => void;
    selectedFriendProfile: User | null;
  };
  dms: Room[];
  isLoadingDMs: boolean;
  handleMessageClick: (u: { id: string; username: string; avatar_url?: string | null }) => Promise<void>;
  handleDMClick: (dm: Room) => void;
}

export default function DiscoveryPage() {
  const { 
    user,
    discoverRooms, 
    isLoadingDiscover, 
    fetchDiscoverRooms, 
    joinExistingRoom, 
    joiningRoomId, 
    navigate,
    onLogout,
    social,
    dms,
    isLoadingDMs,
    handleMessageClick,
    handleDMClick
  } = useOutletContext<HomeContextType>();

  useEffect(() => {
    fetchDiscoverRooms();
  }, [fetchDiscoverRooms]);

  const handleJoinRoom = async (room: Room) => {
    try {
      const updatedRoom = await joinExistingRoom(room);
      navigate(`/${generateSlug(updatedRoom.name)}`, { state: { roomId: updatedRoom.id } });
    } catch {
      // Error handled in useRooms
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 2xl:pr-[380px] scrollbar-none animate-fade-in relative">
      <div className="absolute top-0 right-0 w-full h-[300px] bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none -z-10"></div>
      
      <div className="max-w-4xl mx-auto animate-fade-in w-full">
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold mb-2 text-slate-900 dark:text-slate-50">Explore Communities</h2>
          <p className="text-slate-500 dark:text-slate-400 text-lg">Discover new rooms and join conversations across the platform.</p>
        </div>
        
        {isLoadingDiscover ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700/50 rounded-2xl"></div>
            ))}
          </div>
        ) : discoverRooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {discoverRooms.map((room) => (
              <div key={room.id} className={`bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-500 flex flex-col justify-between ${
                room.isNew ? 'animate-fade-in-up ring-2 ring-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-900/10' : ''
              }`}>
                <div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl mb-4 shadow-sm overflow-hidden ${
                    room.room_profile ? '' : 'bg-blue-500'
                  }`}>
                    {room.room_profile ? (
                      <img src={room.room_profile} alt={`${room.name} profile`} className="w-full h-full object-cover" />
                    ) : (
                      <span>#</span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-slate-50">{room.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Join this room to start chatting with its members.</p>
                </div>
                <AsyncButton
                  onClick={() => handleJoinRoom(room)}
                  isLoading={joiningRoomId === room.id}
                  className="w-full bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white py-2.5 rounded-xl font-bold transition-all duration-300"
                >
                  Join Community
                </AsyncButton>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white/40 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
            <div className="text-4xl mb-4 text-slate-400 italic">✨</div>
            <p className="text-lg text-slate-500 dark:text-slate-400">You've joined all available rooms! Try creating a new one.</p>
          </div>
        )}
      </div>

      {/* Right Sidebar - Unified Command Center (Social + Search) */}
      <aside className="hidden 2xl:flex fixed right-0 top-1/2 -translate-y-1/2 w-[320px] xl:w-[350px] h-[90vh] flex-col z-40 bg-white/60 dark:bg-slate-800/60 backdrop-blur-3xl border border-slate-200/50 dark:border-white/10 border-r-0 rounded-l-[2.5rem] shadow-2xl shadow-slate-900/5 overflow-hidden">
        <SocialSection 
          user={user}
          onLogout={onLogout}
          onOpenProfile={() => social.setIsUserProfileOpen(true)}
          friendsList={social.friendsList}
          pendingList={social.pendingList}
          isLoadingFriends={social.isLoadingFriends}
          onAcceptRequest={social.handleAcceptRequest}
          onDeclineRequest={social.handleDeclineRequest}
          onUserClick={social.handleUserClick}
          onMessageClick={handleMessageClick}
          onNavigate={navigate}
          activeTab={social.activeSidebarTab}
          onTabChange={social.setActiveSidebarTab}
          onSearch={social.handleUserSearch}
          searchResults={social.searchResults}
          isSearching={social.isSearching}
          searchQuery={social.searchQuery}
          dmList={dms}
          isLoadingDMs={isLoadingDMs}
          onDMClick={handleDMClick}
        />
      </aside>

      <MemberProfileModal
        isOpen={social.isFriendProfileOpen}
        onClose={() => {
          social.setIsFriendProfileOpen(false);
          social.handleRefreshFriends();
        }}
        user={social.selectedFriendProfile}
      />

      <UserProfileModal
        isOpen={social.isUserProfileOpen}
        onClose={() => social.setIsUserProfileOpen(false)}
      />
    </div>
  );
}

