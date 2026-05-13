import { useState, useEffect, useMemo, useCallback } from 'react';
import { Outlet, useMatch, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import CreateRoomModal from '../components/CreateRoomModal';
import UserProfileModal from '../components/UserProfileModal';
import MemberProfileModal from '../components/MemberProfileModal';
import LoadingScreen from '../components/LoadingScreen';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useRooms } from '../hooks/useRooms';
import { useDMs } from '../hooks/useDMs';
import { useSocial } from '../hooks/useSocial';
import { useChat } from '../hooks/useChat';
import { getChannels, createChannel } from '../services/roomService';
import { loadChannels, saveChannels } from '../utils/persistence';
import type { Room, Channel } from '../types/room';
import { generateSlug } from '../utils/slug';

export default function HomeLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [isSocialOpen, setIsSocialOpen] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();
  const matchRoom = useMatch('/:roomSlug/*');
  const matchChannel = useMatch('/:roomSlug/:channelSlug');
  const isDiscoveryMode = location.pathname === '/discovery';
  const isWelcomeMode = location.pathname === '/';

  const roomSlug = matchRoom?.params.roomSlug;
  const channelSlug = matchChannel?.params.channelSlug;
  const isSettingsView = location.pathname.endsWith('/settings');

  const stateRoomId = location.state?.roomId;
  const stateChannelId = location.state?.channelId;

  const { addToast } = useToast();
  const { logout, user } = useAuth();
  const { isDarkMode, mounted, toggleTheme } = useTheme();

  const { 
    rooms, 
    setRooms,
    discoverRooms, 
    setDiscoverRooms,
    isLoadingRooms, 
    isLoadingDiscover, 
    isCreatingRoom, 
    joiningRoomId, 
    fetchDiscoverRooms, 
    createNewRoom, 
    joinExistingRoom 
  } = useRooms();

  const { dms, createDM, deleteDM, isLoading: isLoadingDMs } = useDMs();
  const social = useSocial();

  const currentRoom = rooms.find((r: Room) => stateRoomId ? r.id === stateRoomId : generateSlug(r.name) === roomSlug) || 
                      dms.find((r: Room) => stateRoomId ? r.id === stateRoomId : generateSlug(r.name) === roomSlug);
  const roomId = currentRoom?.id;
  const currentChannel = channels.find(c => stateChannelId ? c.id === stateChannelId : generateSlug(c.name) === channelSlug);
  const channelId = currentChannel?.id;

  const isHomeView = isWelcomeMode || currentRoom?.is_dm;

  const {
    messages,
    members,
    typingUsers,
    isLoadingMessages,
    sendMessage,
    unsendMessage,
    startTyping,
    stopTyping,
    toggleReaction,
    fetchMembers,
    onRoomCreated,
    onRoomDeleted,
    onChannelCreated
  } = useChat(roomId, channelId, currentRoom?.isMember);

  useEffect(() => {
    const unsubscribe = onRoomCreated((data: unknown) => {
      const newRoom = data as Room;
      setRooms(prevRooms => {
        if (!prevRooms.some(r => r.id === newRoom.id)) {
          setDiscoverRooms(prevDiscover => {
            if (prevDiscover.some(r => r.id === newRoom.id)) return prevDiscover;
            return [...prevDiscover, { ...newRoom, isNew: true }];
          });
        }
        return prevRooms;
      });
    });
    return unsubscribe;
  }, [onRoomCreated, setRooms, setDiscoverRooms]);

  useEffect(() => {
    const unsubscribe = onRoomDeleted((deletedRoomId: string) => {
      setRooms(prevRooms => prevRooms.filter(r => r.id !== deletedRoomId));
      setDiscoverRooms(prevDiscover => prevDiscover.filter(r => r.id !== deletedRoomId));
      
      if (roomId === deletedRoomId) {
        navigate('/');
        addToast('This room has been deleted by the owner.', 'info');
      }
    });
    return unsubscribe;
  }, [onRoomDeleted, roomId, setRooms, setDiscoverRooms, addToast, navigate]);

  useEffect(() => {
    let isMounted = true;

    if (currentRoom?.isMember) {
      const fetchAndCacheChannels = async (showLoading: boolean) => {
        if (showLoading) {
          setIsLoadingChannels(true);
        }

        try {
          const rawData = await getChannels(currentRoom.id);
          if (!isMounted) return;

          const data = rawData as Channel[];
          setChannels(data);
          saveChannels(currentRoom.id, data);
          
          // Only redirect if still on the room root and not settings
          if (!channelId && !isSettingsView && data.length > 0) {
            navigate(`/${generateSlug(currentRoom.name)}/${generateSlug(data[0].name)}`, { 
              replace: true,
              state: { roomId: currentRoom.id, channelId: data[0].id }
            });
          }
        } catch (err) {
          console.error('Failed to load channels', err);
          if (isMounted) setChannels([]);
        } finally {
          if (isMounted) setIsLoadingChannels(false);
        }
      };

      // Try to load from cache first
      loadChannels(currentRoom.id).then(cached => {
        if (!isMounted) return;

        if (cached && cached.length > 0) {
          const cachedChannels = cached as Channel[];
          setChannels(cachedChannels);
          setIsLoadingChannels(false);
          
          // Immediate redirect on cache hit if needed
          if (!channelId && !isSettingsView) {
            navigate(`/${generateSlug(currentRoom.name)}/${generateSlug(cachedChannels[0].name)}`, { 
              replace: true,
              state: { roomId: currentRoom.id, channelId: cachedChannels[0].id }
            });
          }
          fetchAndCacheChannels(false); // Silent sync
        } else {
          fetchAndCacheChannels(true); // Full loading
        }
      });
    } else {
      queueMicrotask(() => {
        setIsLoadingChannels(false);
        setChannels([]);
      });
    }

    return () => { isMounted = false; };
  }, [currentRoom?.id, currentRoom?.isMember, currentRoom?.name, channelId, isSettingsView, navigate]);

  useEffect(() => {
    const unsubscribe = onChannelCreated((data: unknown) => {
      const newChannel = data as Channel;
      setChannels(prev => {
        if (currentRoom?.id === newChannel.room_id) {
          if (prev.some(c => c.id === newChannel.id)) return prev;
          return [...prev, { ...newChannel, isNew: true }];
        }
        return prev;
      });
    });
    return unsubscribe;
  }, [onChannelCreated, currentRoom?.id]);

  const handleSelectRoom = (room: Room) => {
    setIsMobileMenuOpen(false);
    setIsSocialOpen(false);
    navigate(`/${generateSlug(room.name)}`, { state: { roomId: room.id } });
  };

  const handleSelectChannel = (channel: Channel) => {
    setIsMobileMenuOpen(false);
    if (currentRoom) {
      navigate(`/${generateSlug(currentRoom.name)}/${generateSlug(channel.name)}`, { 
        state: { roomId: currentRoom.id, channelId: channel.id } 
      });
    }
  };

  const handleDiscoverRoom = () => {
    setIsMobileMenuOpen(false);
    setIsSocialOpen(false);
    navigate('/discovery');
  };

  const handleCreateRoom = async (name: string, file: File | null) => {
    try {
      const newRoom = await createNewRoom(name, file);
      setIsCreateModalOpen(false);
      navigate(`/${generateSlug(newRoom.name)}`, { state: { roomId: newRoom.id } });
    } catch {
      // Error is handled in useRooms
    }
  };

  const handleCreateChannel = async (name: string) => {
    if (!currentRoom) return;
    setIsCreatingChannel(true);
    try {
      const newChannel = await createChannel(currentRoom.id, name);
      setChannels(prev => [...prev, newChannel as Channel]);
      addToast(`Channel "#${name}" created!`, 'success');
      navigate(`/${generateSlug(currentRoom.name)}/${generateSlug((newChannel as Channel).name)}`, { 
        state: { roomId: currentRoom.id, channelId: (newChannel as Channel).id } 
      });
    } catch (err: unknown) {
      const error = err as Error;
      addToast(error.message || 'Failed to create channel', 'error');
    } finally {
      setIsCreatingChannel(false);
    }
  };

  const handleLogout = useCallback(async () => {
    logout();
    addToast('You have been signed out.', 'info');
    navigate('/login');
  }, [logout, addToast, navigate]);

  const handleDeleteDM = useCallback(async (roomId: string) => {
    const success = await deleteDM(roomId);
    if (success) {
      addToast('Conversation left.', 'info');
      // If we're currently viewing this DM, navigate home
      if (currentRoom?.id === roomId) {
        navigate('/');
      }
      return true;
    } else {
      addToast('Failed to leave conversation.', 'error');
      return false;
    }
  }, [deleteDM, addToast, currentRoom?.id, navigate]);

  const handleMessageClick = useCallback(async (u: { id: string; username: string; avatar_url?: string | null }) => {
    try {
      const result = await createDM(u.id);
      if (result) {
        setIsSocialOpen(false);
        navigate(`/${generateSlug(result.room.name)}/${generateSlug('chat')}`, { 
          state: { roomId: result.room.id, channelId: result.channelId } 
        });
      } else {
        addToast('Failed to start conversation.', 'error');
      }
    } catch {
      addToast('An error occurred.', 'error');
    }
  }, [createDM, navigate, addToast]);

  const handleDMClick = useCallback((dm: Room) => {
    setIsSocialOpen(false);
    navigate(`/${generateSlug(dm.name)}/${generateSlug('chat')}`, { 
      state: { roomId: dm.id, channelId: dm.defaultChannelId } 
    });
  }, [navigate]);

  const outletContext = useMemo(() => ({
    currentRoom,
    currentChannel,
    channels,
    isLoadingChannels,
    messages,
    members,
    user,
    typingUsers,
    isLoadingMessages,
    sendMessage,
    unsendMessage,
    startTyping,
    stopTyping,
    toggleReaction,
    fetchMembers,
    rooms,
    discoverRooms,
    isLoadingRooms,
    isLoadingDiscover,
    fetchDiscoverRooms,
    joiningRoomId,
    joinExistingRoom,
    setRooms,
    openCreateModal: () => setIsCreateModalOpen(true),
    navigate,
    onLogout: handleLogout,
    // Add social context for WelcomeDashboard to use lifted state
    social,
    dms,
    isLoadingDMs,
    handleMessageClick,
    handleDMClick,
    handleDeleteDM
  }), [
    currentRoom, 
    currentChannel, 
    channels, 
    isLoadingChannels, 
    messages, 
    members, 
    user, 
    typingUsers, 
    isLoadingMessages, 
    sendMessage, 
    unsendMessage, 
    startTyping, 
    stopTyping, 
    toggleReaction, 
    fetchMembers, 
    rooms, 
    discoverRooms, 
    isLoadingRooms, 
    isLoadingDiscover, 
    fetchDiscoverRooms, 
    joiningRoomId, 
    joinExistingRoom, 
    setRooms, 
    setIsCreateModalOpen,
    navigate,
    handleLogout,
    social,
    dms,
    isLoadingDMs,
    handleMessageClick,
    handleDMClick,
    handleDeleteDM
  ]);

  // Show a full-page loading screen until both user and initial rooms are loaded
  if (!user || (isLoadingRooms && rooms.length === 0)) {
    return (
      <LoadingScreen 
        message={!user ? "Syncing your profile..." : "Getting your rooms ready..."} 
      />
    );
  }

  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-950 relative overflow-hidden font-sans text-slate-900 dark:text-slate-50">
      
      <div className="absolute top-[10%] left-[20%] w-[400px] h-[400px] bg-blue-500/30 dark:bg-blue-500/15 rounded-full blur-[80px] z-0 animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-[10%] right-[20%] w-[350px] h-[350px] bg-purple-500/30 dark:bg-purple-500/15 rounded-full blur-[80px] z-0 animate-pulse pointer-events-none" style={{ animationDelay: '2s' }}></div>

      <Sidebar 
        rooms={rooms}
        dms={dms}
        channels={channels}
        currentRoomId={roomId}
        currentChannelId={channelId}
        isDarkMode={isDarkMode}
        mounted={mounted}
        isOpen={isMobileMenuOpen}
        isCollapsed={isDiscoveryMode || isWelcomeMode}
        isDiscoveryMode={isDiscoveryMode}
        isWelcomeMode={isHomeView}
        isHomeDashboard={isWelcomeMode}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        onClose={() => setIsMobileMenuOpen(false)}
        onHomeClick={() => {
          setIsMobileMenuOpen(false);
          setIsSocialOpen(false);
          navigate('/');
        }}
        onSelectRoom={handleSelectRoom}
        onSelectChannel={handleSelectChannel}
        onSelectDM={(dm) => {
          setIsMobileMenuOpen(false);
          setIsSocialOpen(false);
          navigate(`/${generateSlug(dm.name)}/${generateSlug('chat')}`, { 
            state: { roomId: dm.id, channelId: dm.defaultChannelId } 
          });
        }}
        onCreateRoom={() => setIsCreateModalOpen(true)}
        onCreateChannel={handleCreateChannel}
        onDiscoverRoom={handleDiscoverRoom}
        onOpenProfile={() => setIsUserProfileOpen(true)}
        isLoadingRooms={isLoadingRooms}
        isCreatingRoom={isCreatingRoom}
        isCreatingChannel={isCreatingChannel}
        userRole={currentRoom?.role || null}
        // Social Drawer Props
        isSocialOpen={isSocialOpen}
        onToggleSocial={() => setIsSocialOpen(!isSocialOpen)}
        social={social}
        isLoadingDMs={isLoadingDMs}
        onMessageClick={handleMessageClick}
        onDMClick={handleDMClick}
        onNavigate={navigate}
      />

      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateRoom}
      />

      <UserProfileModal
        isOpen={isUserProfileOpen}
        onClose={() => setIsUserProfileOpen(false)}
      />

      <MemberProfileModal
        isOpen={social.isFriendProfileOpen}
        onClose={() => {
          social.setIsFriendProfileOpen(false);
          social.handleRefreshFriends();
        }}
        user={social.selectedFriendProfile}
      />

      <main className="flex-1 relative flex flex-col z-10 w-full md:w-auto md:bg-white/40 md:dark:bg-slate-800/40 md:backdrop-blur-md">

        {(
          <>
            <header className={`${isWelcomeMode || isDiscoveryMode ? 'md:hidden' : ''} h-16 border-b border-slate-200/50 dark:border-white/10 flex items-center justify-between px-4 md:px-8 bg-white/40 dark:bg-slate-800/40 md:bg-transparent backdrop-blur-md z-20 sticky top-0 md:h-20`}>
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="md:hidden shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-white/50 dark:bg-slate-700/50 border border-slate-200/50 dark:border-white/10 hover:scale-105 hover:shadow-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                >
                  <svg className="w-5 h-5 text-slate-700 dark:text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                {!isWelcomeMode ? (<div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-sm shadow-blue-500/20 overflow-hidden ${
                  currentRoom?.is_dm ? 'bg-slate-200 dark:bg-slate-700' : (currentRoom?.room_profile ? '' : 'bg-blue-500')
                }`}>
                  {currentRoom?.is_dm ? (
                    currentRoom.targetUser?.avatar_url ? (
                      <img src={currentRoom.targetUser.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-slate-600 dark:text-slate-300">{(currentRoom.targetUser?.username || 'U').substring(0,1).toUpperCase()}</span>
                    )
                  ) : currentRoom?.room_profile ? (
                    <img src={currentRoom.room_profile} alt={`${currentRoom.name} profile`} className="w-full h-full object-cover" />
                  ) : (
                    <span>#</span>    
                  )}
                </div>) : <></>}

                <div className="flex flex-col min-w-0">
                  {/* display room name if on desktop */}
                  <h1 className="hidden md:block text-lg font-bold text-slate-900 dark:text-slate-50 truncate">
                    {isDiscoveryMode ? 'Discover Rooms' : (currentRoom?.is_dm ? currentRoom.targetUser?.username : (currentRoom ? currentRoom.name : (isWelcomeMode ? 'Deezcord' : 'Select a Room')))}
                  </h1>
                  {/* display channel name in header if on mobile */}
                  <h1 className="md:hidden text-lg font-bold text-slate-900 dark:text-slate-50 truncate">
                    {isDiscoveryMode ? 'Discover Rooms' : (currentRoom?.is_dm ? currentRoom.targetUser?.username : (currentRoom ? (currentChannel ? `#${currentChannel.name}` : currentRoom.name) : (isWelcomeMode ? 'Deezcord' : 'Select a Room')))}
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 truncate">
                    {isDiscoveryMode ? 'Find new communities to join' : (currentRoom?.is_dm ? 'Direct Message' : (currentRoom ? (currentRoom.isMember ? (
                      <>
                        <span className='hidden md:inline'>Chatting in</span>
                        {currentChannel && (
                          <span className="hidden md:inline font-semibold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded">#{currentChannel.name}</span>
                        )}
                      </>
                    ) : `Not a member of ${currentRoom.name}`) : ('Join the conversation')))}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-6 shrink-0">
                {!isDiscoveryMode && currentRoom?.isMember && members.length > 0 && !currentRoom?.is_dm && (
                  <div className="group relative">
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm cursor-help transition-all hover:bg-emerald-500/20">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      {members.filter(m => m.isOnline).length} active now
                    </div>
                    
                    {/* Online Users Tooltip */}
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-white/10 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 transform origin-top-right group-hover:translate-y-0 translate-y-2">
                      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 mb-1">
                        Active Members
                      </div>
                      <div className="max-h-48 overflow-y-auto custom-scrollbar">
                        {members.filter(m => m.isOnline).map((member) => (
                          <div key={member.user_id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold overflow-hidden ring-1 ring-white/20">
                              {member.profiles.avatar_url ? (
                                <img src={member.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                member.profiles.username.substring(0, 2).toUpperCase()
                              )}
                            </div>
                            <span className="text-xs font-semibold truncate dark:text-slate-200">
                              {member.profiles.username}
                            </span>
                          </div>
                        ))}
                        {members.filter(m => m.isOnline).length === 0 && (
                          <div className="text-xs text-slate-400 dark:text-slate-500 p-2 text-center">
                            No one online
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {currentRoom?.isMember && !isDiscoveryMode && (
                  <button
                    onClick={() => isSettingsView ? navigate(`/${generateSlug(currentRoom.name)}`, { state: { roomId: currentRoom.id, channelId: currentChannel?.id } }) : navigate(`/${generateSlug(currentRoom.name)}/settings`, { state: { roomId: currentRoom.id } })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 font-bold text-sm ${
                                          isSettingsView 
                                            ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/30' 
                                            : 'bg-white/50 dark:bg-slate-800/50 border-slate-200/50 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md'
                                        } cursor-pointer`}
                  >
                    <svg className={`w-4 h-4 transition-transform duration-500 ${isSettingsView ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="hidden md:inline">
                      {isSettingsView ? 'Back to Chat' : 'Settings'}
                    </span>
                  </button>
                )}
              </div>
            </header>
          </>
        )}

        <div className={`flex-1 flex flex-col bg-white/50 dark:bg-slate-950/50 md:rounded-tl-[2.5rem] border-t border-slate-200/50 dark:border-white/10 md:border-l overflow-hidden min-h-0 ${isWelcomeMode ? 'md:rounded-tl-none border-t-0 md:border-l-0 bg-transparent dark:bg-transparent' : ''}`}>
          <Outlet context={outletContext} />
        </div>
      </main>
    </div>
  );
}
