import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { NavigateFunction } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

// Sub-components
import WelcomeHeader from './components/WelcomeHeader';
import HeroFeatureCard from './components/HeroFeatureCard';
import InviteTeamCard from './components/InviteTeamCard';
import RecentRooms from './components/RecentRooms';
import SocialSection from './components/SocialSection';
import SearchSidebar from './components/SearchSidebar';
import NewUserEmptyState from './components/NewUserEmptyState';
import MemberProfileModal from '../../components/MemberProfileModal';
import UserProfileModal from '../../components/UserProfileModal';

// Types
import type { Room } from '../../types/room';
import type { User } from '../../types/user';

interface HomeContextType {
  user: User | null;
  rooms: Room[];
  discoverRooms: Room[];
  joinExistingRoom: (roomId: string) => Promise<void>;
  isJoining: boolean;
  isLoadingRooms: boolean;
  navigate: NavigateFunction;
  onLogout: () => Promise<void>;
}

const WelcomeDashboard = () => {
  const { 
    user: contextUser, 
    rooms, 
    discoverRooms, 
    joinExistingRoom, 
    isJoining, 
    isLoadingRooms, 
    navigate,
    onLogout: contextLogout
  } = useOutletContext<HomeContextType>();

  const { user: authUser } = useAuth();
  const user = authUser || contextUser;

  const [friendsList, setFriendsList] = useState<User[]>([]);
  const [pendingList, setPendingList] = useState<User[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [selectedFriendProfile, setSelectedFriendProfile] = useState<{ id: string; username: string; avatar_url?: string | null } | null>(null);
  const [isFriendProfileOpen, setIsFriendProfileOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isNewUser = rooms.length === 0;

  useEffect(() => {
    const fetchFriends = async () => {
      setIsLoadingFriends(true);
      try {
        const { getFriendsList, getPendingFriends } = await import('../../services/roomService');
        const [friendsData, pendingData] = await Promise.all([
          getFriendsList(),
          getPendingFriends()
        ]);
        setFriendsList(friendsData);
        setPendingList(pendingData);
      } catch (error) {
        console.error("Failed to load friends", error);
      } finally {
        setIsLoadingFriends(false);
      }
    };
    fetchFriends();
  }, []);

  const handleUserSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { searchUsers } = await import('../../services/roomService');
      const results = await searchUsers(query);
      setSearchResults(results);
    } catch (err) {
      console.error('Failed to search users', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAcceptRequest = async (requesterId: string) => {
    try {
      const { acceptFriend } = await import('../../services/roomService');
      await acceptFriend(requesterId);
      const acceptedFriend = pendingList.find(p => p.id === requesterId);
      if (acceptedFriend) {
        setPendingList(prev => prev.filter(p => p.id !== requesterId));
        setFriendsList(prev => [...prev, { ...acceptedFriend, status: 'friends', isOnline: false }]);
      }
    } catch (err) {
      console.error('Failed to accept friend request', err);
    }
  };

  const handleDeclineRequest = async (requesterId: string) => {
    try {
      const { removeFriend } = await import('../../services/roomService');
      await removeFriend(requesterId);
      setPendingList(prev => prev.filter(p => p.id !== requesterId));
    } catch (err) {
      console.error('Failed to decline friend request', err);
    }
  };

  const handleUserClick = (u: { id: string; username: string; avatar_url?: string | null }) => {
    setSelectedFriendProfile(u);
    setIsFriendProfileOpen(true);
  };

  const handleRefreshFriends = async () => {
    const { getFriendsList } = await import('../../services/roomService');
    const friendsData = await getFriendsList();
    setFriendsList(friendsData);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 scrollbar-none animate-fade-in relative">
      <div className="absolute top-0 right-0 w-full h-[300px] bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none -z-10"></div>
      
      <div className="max-w-7xl mx-auto relative">
        <div className="flex flex-col items-center relative">
          {/* Main Content Area - Truly Centered */}
          <div className="w-full max-w-5xl space-y-16 lg:pr-0">
            <WelcomeHeader 
              user={user} 
              roomCount={rooms.length} 
              isNewUser={isNewUser} 
            />

            <div className="space-y-16">
              {/* Room Access Section */}
              <section>
                {isNewUser ? (
                  <NewUserEmptyState 
                    onDiscover={() => navigate('/discovery')}
                    onCreateRoom={() => navigate('/', { state: { openCreateModal: true } })}
                  />
                ) : (
                  <RecentRooms 
                    rooms={rooms} 
                    isLoading={isLoadingRooms} 
                    onNavigate={navigate} 
                  />
                )}
              </section>

              {/* CTA Row - High visibility actions */}
              <section className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <HeroFeatureCard 
                  isNewUser={isNewUser} 
                  onExplore={() => navigate('/discovery')} 
                />
                <InviteTeamCard 
                  onAction={() => navigate('/', { state: { openCreateModal: true } })}
                />
              </section>
            </div>
          </div>
        </div>
      </div>

      {/* Left Sidebar - Search & Discovery (Not glued to edge) */}
      <aside className="hidden 2xl:block fixed left-8 top-1/2 -translate-y-1/2 w-[320px] max-h-[85vh] z-40">
        <SearchSidebar 
          onSearch={handleUserSearch}
          onNavigate={navigate}
          results={searchResults}
          isLoading={isSearching}
          onUserClick={handleUserClick}
          searchQuery={searchQuery}
        />
      </aside>

      {/* Right Sidebar - Floating Social Sidebar (Fixed to middle-right edge) */}
      <aside className="hidden 2xl:block fixed right-0 top-1/2 -translate-y-1/2 w-[320px] xl:w-[350px] max-h-[85vh] overflow-y-auto scrollbar-none pb-4 z-40">
        <SocialSection 
          user={user}
          onLogout={contextLogout}
          onOpenProfile={() => setIsUserProfileOpen(true)}
          friendsList={friendsList}
          pendingList={pendingList}
          isLoadingFriends={isLoadingFriends}
          onAcceptRequest={handleAcceptRequest}
          onDeclineRequest={handleDeclineRequest}
          onUserClick={handleUserClick}
          onNavigate={navigate}
        />
      </aside>

      <MemberProfileModal
        isOpen={isFriendProfileOpen}
        onClose={() => {
          setIsFriendProfileOpen(false);
          handleRefreshFriends();
        }}
        user={selectedFriendProfile}
      />

      <UserProfileModal
        isOpen={isUserProfileOpen}
        onClose={() => setIsUserProfileOpen(false)}
      />
    </div>
  );
};

export default WelcomeDashboard;
