import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { NavigateFunction } from 'react-router-dom';
import { generateSlug } from '../../utils/slug';
import MemberProfileModal from '../../components/MemberProfileModal';
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

export default function WelcomePage() {
  const { user, rooms, discoverRooms, joinExistingRoom, isJoining, isLoadingRooms, navigate } = useOutletContext<HomeContextType>();

  // State moved from Sidebar
  const [friendsList, setFriendsList] = useState<User[]>([]);
  const [pendingList, setPendingList] = useState<User[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [selectedFriendProfile, setSelectedFriendProfile] = useState<{ id: string; username: string; avatar_url?: string | null } | null>(null);
  const [isFriendProfileOpen, setIsFriendProfileOpen] = useState(false);

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
        setFriendsList(prev => [...prev, { ...acceptedFriend, status: 'friends' }]);
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

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const displayName = user?.username || user?.email?.split('@')[0] || 'User';
  const recentRooms = rooms.slice(0, 4);
  const suggestedRooms = discoverRooms.slice(0, 3);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-12 scrollbar-none animate-fade-in relative">
      {/* Background Elements */}
      <div className="absolute top-0 right-0 w-full h-[300px] bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none -z-10"></div>
      
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <h2 className="text-sm font-extrabold text-blue-500 dark:text-blue-400 uppercase tracking-[0.2em]">
              Dashboard
            </h2>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
              {getTimeGreeting()}, <span className="text-blue-600 dark:text-blue-400">{displayName}</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium max-w-lg">
              It's great to see you again! You have <span className="text-slate-900 dark:text-slate-200 font-bold">{rooms.length} rooms</span> active right now.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group">
              <input 
                type="text" 
                placeholder="Find people..." 
                className="w-full md:w-64 px-5 py-3 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm font-medium transition-all group-hover:bg-white dark:group-hover:bg-slate-800 shadow-sm"
              />
              <svg className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </header>

        {/* Hero Feature Card */}
        <div className="relative group overflow-hidden rounded-[3rem] bg-gradient-to-br from-indigo-600 to-blue-700 p-1 shadow-2xl shadow-blue-500/20">
          <div className="absolute inset-0 bg-[url('/Logo.png')] bg-no-repeat bg-right-bottom bg-contain opacity-10 grayscale group-hover:scale-110 transition-transform duration-700"></div>
          <div className="relative bg-white/5 backdrop-blur-3xl rounded-[2.9rem] p-8 md:p-12 flex flex-col md:flex-row items-center gap-10">
            <div className="w-32 h-32 md:w-48 md:h-48 rounded-[2.5rem] bg-white/10 backdrop-blur-2xl border border-white/20 flex items-center justify-center shadow-2xl relative group-hover:rotate-3 transition-transform duration-500 shrink-0">
              <img src="/Logo.png" alt="Logo" className="w-20 h-20 md:w-32 md:h-32 object-contain drop-shadow-2xl" />
              <div className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-emerald-400 flex items-center justify-center shadow-lg animate-bounce duration-[3s]">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            <div className="flex-1 text-center md:text-left space-y-6">
              <div className="space-y-2">
                <h3 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  Connect with your <br/>communities instantly.
                </h3>
                <p className="text-indigo-100/80 text-lg font-medium max-w-xl">
                  Deezcord is your unified hub for real-time collaboration. Create, join, and chat with friends in a beautiful, glass-inspired interface.
                </p>
              </div>
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <button 
                  onClick={() => navigate('/discovery')}
                  className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-bold text-lg shadow-xl shadow-white/10 hover:scale-105 active:scale-95 transition-all duration-300"
                >
                  Explore Rooms
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Feed Column (Recent Activity / Rooms) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">Recent Hubs</h3>
              <button className="text-sm font-bold text-blue-500 hover:underline">View All</button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {isLoadingRooms ? (
                [1,2,3,4].map(i => (
                  <div key={i} className="h-32 rounded-[2rem] bg-white/40 dark:bg-slate-800/40 animate-pulse border border-slate-200/50 dark:border-white/10"></div>
                ))
              ) : recentRooms.length > 0 ? (
                recentRooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => navigate(`/${generateSlug(room.name)}`, { state: { roomId: room.id } })}
                    className="group flex flex-col justify-between p-6 rounded-[2rem] bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 shadow-sm hover:shadow-xl hover:bg-white dark:hover:bg-slate-800 hover:-translate-y-1 transition-all duration-500 text-left min-h-[140px] relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                    
                    <div className="flex items-center gap-4 relative z-10">
                      <div className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center text-white font-bold text-xl overflow-hidden shadow-lg group-hover:scale-110 transition-transform duration-500 ${room.room_profile ? '' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                        {room.room_profile ? (
                          <img src={room.room_profile} alt={room.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{room.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-slate-900 dark:text-slate-50 truncate group-hover:text-blue-500 transition-colors text-lg">
                          {room.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Active</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="col-span-full p-12 rounded-[2.5rem] bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-dashed border-slate-300 dark:border-slate-700 text-center flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-2xl mb-4">🏠</div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-slate-50">No rooms yet</h4>
                  <p className="text-slate-500 font-medium mt-1">Start by discovering new communities or creating your own.</p>
                </div>
              )}
            </div>
            
            {/* Feature Highlights (Moved Below Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-slate-200/50 dark:border-white/10">
              <div className="p-8 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10 flex flex-col gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 dark:text-slate-50">Instant Sync</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">Everything is real-time. No more refreshing to see new messages.</p>
                </div>
              </div>
              <div className="p-8 rounded-[2rem] bg-purple-500/5 border border-purple-500/10 flex flex-col gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 dark:text-slate-50">Secure Auth</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">Enterprise-grade security powered by Supabase identity management.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Social Column (Friends & Requests & Suggestions) */}
          <div className="space-y-6">
             <div className="flex items-center justify-between px-2">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">Social</h3>
            </div>

            {/* Pending Requests Container */}
            {pendingList.length > 0 && (
              <div className="p-1 rounded-[2rem] bg-gradient-to-br from-orange-400 to-rose-500 shadow-lg shadow-orange-500/20 animate-fade-in-up">
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[1.85rem] p-5">
                  <h4 className="text-xs font-extrabold text-orange-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                    Action Required ({pendingList.length})
                  </h4>
                  <div className="space-y-3 max-h-48 overflow-y-auto scrollbar-none pr-1">
                    {pendingList.map(request => (
                      <div key={request.id} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/5">
                        <div 
                          className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-bold text-sm shadow-sm overflow-hidden cursor-pointer shrink-0"
                          onClick={() => {
                            setSelectedFriendProfile({ id: request.id, username: request.username, avatar_url: request.avatar_url });
                            setIsFriendProfileOpen(true);
                          }}
                        >
                          {request.avatar_url ? (
                            <img src={request.avatar_url} alt={request.username} className="w-full h-full object-cover" />
                          ) : (
                            <span>{(request.username || 'U').substring(0, 1).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{request.username}</p>
                          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">Wants to connect</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleAcceptRequest(request.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 shadow-md transition-transform hover:scale-105 active:scale-95"
                            title="Accept"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeclineRequest(request.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-red-500 hover:text-white transition-all hover:scale-105 active:scale-95"
                            title="Decline"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Friends List Container */}
            <div className="p-6 rounded-[2rem] bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 shadow-sm flex flex-col max-h-[400px]">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50">Active Friends</h4>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                  {friendsList.filter(f => f.isOnline).length} Online
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto scrollbar-none space-y-2 -mx-2 px-2">
                {isLoadingFriends ? (
                  [1,2,3].map(i => (
                    <div key={i} className="h-14 bg-slate-100/50 dark:bg-slate-700/30 rounded-2xl animate-pulse"></div>
                  ))
                ) : friendsList.length > 0 ? (
                  // Sort online first
                  [...friendsList].sort((a, b) => (a.isOnline === b.isOnline) ? 0 : a.isOnline ? -1 : 1).map(friend => (
                    <div 
                      key={friend.id} 
                      onClick={() => {
                        setSelectedFriendProfile({ id: friend.id, username: friend.username, avatar_url: friend.avatar_url });
                        setIsFriendProfileOpen(true);
                      }}
                      className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white dark:hover:bg-slate-700/50 transition-all cursor-pointer group shadow-sm border border-transparent hover:border-slate-200/50 dark:hover:border-white/5"
                    >
                      <div className="relative flex-shrink-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm overflow-hidden ${friend.isOnline ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 'bg-gradient-to-br from-slate-400 to-slate-600'}`}>
                          {friend.avatar_url ? (
                            <img src={friend.avatar_url} alt={friend.username} className="w-full h-full object-cover" />
                          ) : (
                            <span>{(friend.username || 'U').substring(0, 1).toUpperCase()}</span>
                          )}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-800 ${friend.isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-500 transition-colors">{friend.username}</p>
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate uppercase tracking-widest">{friend.isOnline ? 'Online' : 'Offline'}</p>
                      </div>
                      <button className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-500 hover:text-white">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-xl mb-3">👋</div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-50">It's quiet here</p>
                    <p className="text-xs text-slate-500 mt-1">Use the search bar above to find friends.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Discovery Suggestions Container */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50">Suggested Rooms</h4>
                <button onClick={() => navigate('/discovery')} className="text-xs font-bold text-blue-500 hover:underline">See All</button>
              </div>
              {suggestedRooms.length > 0 ? (
                suggestedRooms.map((room) => (
                  <div key={room.id} className="p-4 rounded-[2rem] bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 shadow-sm flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 flex-shrink-0 overflow-hidden shadow-md">
                        {room.room_profile ? (
                          <img src={room.room_profile} alt={room.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-bold">
                            {room.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="text-sm font-bold text-slate-900 dark:text-slate-50 truncate">{room.name}</h5>
                        <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Public Community</p>
                      </div>
                    </div>
                    <button
                      onClick={() => joinExistingRoom(room.id)}
                      disabled={isJoining}
                      className="w-full py-2.5 bg-blue-500/10 hover:bg-blue-500 text-blue-600 dark:text-blue-400 hover:text-white rounded-xl font-bold text-sm transition-all duration-300 disabled:opacity-50"
                    >
                      {isJoining ? 'Joining...' : 'Quick Join'}
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-6 rounded-[2rem] bg-slate-100/50 dark:bg-slate-800/20 border border-slate-200/50 dark:border-white/5 text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Finding communities...</p>
                </div>
              )}
            </div>

            {/* Create Room CTA */}
            <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden group">
                 <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/40 transition-colors"></div>
                 <h4 className="text-lg font-bold relative z-10">Invite your team</h4>
                 <p className="text-sm text-slate-400 mt-2 relative z-10">Every community starts with a single room. Create yours today.</p>
                 <button 
                  onClick={() => navigate('/', { state: { openCreateModal: true } })}
                  className="mt-6 w-full py-3 bg-white text-slate-900 rounded-xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all relative z-10 shadow-xl"
                 >
                   Create a Room
                 </button>
            </div>

          </div>

        </div>
      </div>

      <MemberProfileModal
        isOpen={isFriendProfileOpen}
        onClose={() => {
          setIsFriendProfileOpen(false);
          import('../../services/roomService').then(({ getFriendsList }) => {
            getFriendsList().then(setFriendsList);
          });
        }}
        user={selectedFriendProfile}
      />
    </div>
  );
}

