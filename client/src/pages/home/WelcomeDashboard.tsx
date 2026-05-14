import { useOutletContext } from 'react-router-dom';
import type { NavigateFunction } from 'react-router-dom';

// Sub-components
import WelcomeHeader from './components/WelcomeHeader';
import HeroFeatureCard from './components/HeroFeatureCard';
import InviteTeamCard from './components/InviteTeamCard';
import ProfileSetupCard from './components/ProfileSetupCard';
import RecentRooms from './components/RecentRooms';
import SocialSection from './components/SocialSection';

// Types
import type { Room } from '../../types/room';
import type { User } from '../../types/user';

interface HomeContextType {
  user: User | null;
  rooms: Room[];
  discoverRooms: Room[];
  joinExistingRoom: (room: Room) => Promise<Room>;
  joiningRoomId: string | null;
  isLoadingRooms: boolean;
  openCreateModal: () => void;
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
  };
  dms: Room[];
  isLoadingDMs: boolean;
  handleMessageClick: (u: { id: string; username: string; avatar_url?: string | null }) => Promise<void>;
  handleDMClick: (dm: Room) => void;
}

const WelcomeDashboard = () => {
  const { 
    user, 
    rooms,  
    isLoadingRooms, 
    openCreateModal,
    navigate,
    onLogout,
    social,
    dms,
    isLoadingDMs,
    handleMessageClick,
    handleDMClick
  } = useOutletContext<HomeContextType>();

  const isNewUser = !isLoadingRooms && rooms.length === 0;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 2xl:pr-95 scrollbar-none animate-fade-in relative">
      <div className="absolute top-0 right-0 w-full h-75 bg-linear-to-b from-blue-500/10 to-transparent pointer-events-none -z-10"></div>
      
      <div className="w-full relative">
        <div className="flex flex-col relative">
          {/* Main Content Area - Balanced with Sidebar */}
          <div className="w-full max-w-6xl mx-auto 2xl:ml-0 2xl:max-w-7xl space-y-16">
            <WelcomeHeader 
              user={user} 
              roomCount={rooms.length} 
              isNewUser={isNewUser} 
              isLoading={isLoadingRooms}
            />

            <div className="space-y-16">
              {/* Room Content & Actions */}
              <div className="space-y-12">
                {!isNewUser && (
                  <section>
                    <RecentRooms 
                      rooms={rooms} 
                      isLoading={isLoadingRooms} 
                      onNavigate={navigate} 
                    />
                  </section>
                )}

                {/* CTA Row - Primary actions for both new and returning users */}
                <section className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  <HeroFeatureCard 
                    isNewUser={isNewUser} 
                    onExplore={() => navigate('/discovery')} 
                    className={isNewUser ? 'xl:col-span-2' : ''}
                  />
                  <InviteTeamCard 
                    onAction={() => openCreateModal()}
                  />
                  {isNewUser && !user?.avatar_url && (
                    <ProfileSetupCard 
                      onSetupProfile={() => social.setIsUserProfileOpen(true)}
                    />
                  )}
                </section>

                {/* Mobile/Tablet Social Section (Visible < 2xl) */}
                <section className="2xl:hidden bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/50 dark:border-white/10 rounded-3xl shadow-xl overflow-hidden h-150 flex flex-col mb-8">
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
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Unified Command Center (Social + Search) */}
      <aside className="hidden 2xl:flex fixed right-0 top-1/2 -translate-y-1/2 w-[320px] xl:w-87.5 h-[90vh] flex-col z-40 bg-white/60 dark:bg-slate-800/60 backdrop-blur-3xl border border-slate-200/50 dark:border-white/10 border-r-0 rounded-l-[2.5rem] shadow-2xl shadow-slate-900/5 overflow-hidden">
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
    </div>
  );
};

export default WelcomeDashboard;
