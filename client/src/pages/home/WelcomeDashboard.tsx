import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { NavigateFunction } from 'react-router-dom';

// Sub-components
import WelcomeHeader from './components/WelcomeHeader';
import HeroFeatureCard from './components/HeroFeatureCard';
import InviteTeamCard from './components/InviteTeamCard';
import RecentRooms from './components/RecentRooms';
import SocialSection from './components/SocialSection';
import NewUserEmptyState from './components/NewUserEmptyState';
import MemberProfileModal from '../../components/MemberProfileModal';

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
}

const WelcomeDashboard = () => {
  const { 
    user, 
    rooms, 
    discoverRooms, 
    joinExistingRoom, 
    isJoining, 
    isLoadingRooms, 
    navigate 
  } = useOutletContext<HomeContextType>();

  const [friendsList, setFriendsList] = useState<User[]>([]);
  const [pendingList, setPendingList] = useState<User[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [selectedFriendProfile, setSelectedFriendProfile] = useState<{ id: string; username: string; avatar_url?: string | null } | null>(null);
  const [isFriendProfileOpen, setIsFriendProfileOpen] = useState(false);

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
    <div className="flex-1 overflow-y-auto p-4 md:p-12 scrollbar-none animate-fade-in relative">
      <div className="absolute top-0 right-0 w-full h-[300px] bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none -z-10"></div>
      
      <div className="max-w-6xl mx-auto space-y-12">
        <WelcomeHeader 
          user={user} 
          roomCount={rooms.length} 
          isNewUser={isNewUser} 
        />

        {isNewUser && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <HeroFeatureCard 
              isNewUser={isNewUser} 
              onExplore={() => navigate('/discovery')} 
            />
            <InviteTeamCard 
              onAction={() => navigate('/', { state: { openCreateModal: true } })}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
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
          </div>

          <SocialSection 
            friendsList={friendsList}
            pendingList={pendingList}
            isLoadingFriends={isLoadingFriends}
            onAcceptRequest={handleAcceptRequest}
            onDeclineRequest={handleDeclineRequest}
            onUserClick={handleUserClick}
            onNavigate={navigate}
          />
        </div>

        {!isNewUser && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <HeroFeatureCard 
              isNewUser={isNewUser} 
              onExplore={() => navigate('/discovery')} 
            />
            <InviteTeamCard 
              onAction={() => navigate('/', { state: { openCreateModal: true } })}
            />
          </div>
        )}
      </div>

      <MemberProfileModal
        isOpen={isFriendProfileOpen}
        onClose={() => {
          setIsFriendProfileOpen(false);
          handleRefreshFriends();
        }}
        user={selectedFriendProfile}
      />
    </div>
  );
};

export default WelcomeDashboard;
