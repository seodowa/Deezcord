import { useState, useEffect, useRef } from 'react';
import { Outlet, useMatch, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import CreateRoomModal from '../components/CreateRoomModal';
import UserProfileModal from '../components/UserProfileModal';
import AsyncButton from '../components/AsyncButton';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useRooms } from '../hooks/useRooms';
import { useChat } from '../hooks/useChat';
import { getChannels, createChannel } from '../services/roomService';
import type { Room, Channel } from '../types/room';
import { generateSlug } from '../utils/slug';

export default function HomeLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);

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
    isJoining, 
    fetchDiscoverRooms, 
    createNewRoom, 
    joinExistingRoom 
  } = useRooms();

  const currentRoom = rooms.find(r => stateRoomId ? r.id === stateRoomId : generateSlug(r.name) === roomSlug);
  const roomId = currentRoom?.id;
  const currentChannel = channels.find(c => stateChannelId ? c.id === stateChannelId : generateSlug(c.name) === channelSlug);
  const channelId = currentChannel?.id;

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
    if (currentRoom?.isMember) {
      getChannels(currentRoom.id).then(rawData => {
        const data = rawData as Channel[];
        setChannels(data);
        // If we navigated to a room without a channel, redirect to the first available channel
        if (!channelId && !isSettingsView && data.length > 0) {
          navigate(`/${generateSlug(currentRoom.name)}/${generateSlug(data[0].name)}`, { 
            replace: true,
            state: { roomId: currentRoom.id, channelId: data[0].id }
          });
        }
      }).catch(err => {
        console.error('Failed to load channels', err);
        setChannels([]);
      });
    } else {
      // Defer state update to avoid cascading renders warning
      const timeoutId = setTimeout(() => setChannels([]), 0);
      return () => clearTimeout(timeoutId);
    }
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

  const handleLogout = async () => {
    await new Promise(resolve => setTimeout(resolve, 600));
    logout();
    addToast('You have been signed out.', 'info');
    window.location.href = '/login';
  };

  const outletContext = {
    currentRoom,
    currentChannel,
    channels,
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
    user,
    rooms,
    discoverRooms,
    isLoadingRooms,
    isLoadingDiscover,
    fetchDiscoverRooms,
    isJoining,
    joinExistingRoom,
    setRooms,
    navigate,
    onLogout: handleLogout
  };

  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-950 relative overflow-hidden font-sans text-slate-900 dark:text-slate-50 transition-colors duration-500">
      
      <div className="absolute top-[10%] left-[20%] w-[400px] h-[400px] bg-blue-500/30 dark:bg-blue-500/15 rounded-full blur-[80px] z-0 animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-[10%] right-[20%] w-[350px] h-[350px] bg-purple-500/30 dark:bg-purple-500/15 rounded-full blur-[80px] z-0 animate-pulse pointer-events-none" style={{ animationDelay: '2s' }}></div>

      <Sidebar 
        rooms={rooms}
        channels={channels}
        currentRoomId={roomId}
        currentChannelId={channelId}
        isDarkMode={isDarkMode}
        mounted={mounted}
        isOpen={isMobileMenuOpen}
        isCollapsed={isWelcomeMode}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        onClose={() => setIsMobileMenuOpen(false)}
        onHomeClick={() => {
          setIsMobileMenuOpen(false);
          navigate('/');
        }}
        onSelectRoom={handleSelectRoom}
        onSelectChannel={handleSelectChannel}
        onCreateRoom={() => setIsCreateModalOpen(true)}
        onCreateChannel={handleCreateChannel}
        onDiscoverRoom={handleDiscoverRoom}
        onOpenProfile={() => setIsUserProfileOpen(true)}
        isLoadingRooms={isLoadingRooms}
        isCreatingRoom={isCreatingRoom}
        isCreatingChannel={isCreatingChannel}
        userRole={currentRoom?.role || null}
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

      <main className="flex-1 relative flex flex-col z-10 w-full md:w-auto md:bg-white/40 md:dark:bg-slate-800/40 md:backdrop-blur-md">
        
        {/* Render headers ONLY if not on WelcomePage */}
        {!isWelcomeMode && (
          <>
            {/* Mobile Header */}
            <header className="h-16 border-b border-slate-200/50 dark:border-white/10 flex items-center justify-between px-4 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md md:hidden z-20 sticky top-0">
              <div className="flex items-center gap-3">
                 <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-white/50 dark:bg-slate-700/50 border border-slate-200/50 dark:border-white/10 hover:scale-105 hover:shadow-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                 >
                    <svg className="w-5 h-5 text-slate-700 dark:text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                 </button>
                 
                 {currentRoom && !isDiscoveryMode ? (
                   <div className="flex items-center gap-2 overflow-hidden">
                     <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm overflow-hidden flex-shrink-0 ${
                       currentRoom.room_profile ? '' : 'bg-blue-500'
                     }`}>
                       {currentRoom.room_profile ? (
                         <img src={currentRoom.room_profile} alt={`${currentRoom.name} profile`} className="w-full h-full object-cover" />
                       ) : (
                         <span>#</span>
                       )}
                     </div>
                     <h2 className="text-base font-bold text-slate-900 dark:text-slate-50 truncate">
                       {currentChannel ? `#${currentChannel.name}` : currentRoom.name}
                     </h2>
                   </div>
                 ) : (
                   <div className="flex items-center gap-2">
                     <img src="/Logo.png" alt="Deezcord" className="w-8 h-8 object-contain rounded-lg" />
                     <h2 className="text-lg font-extrabold tracking-tight text-blue-500 dark:text-blue-400">
                       {isDiscoveryMode ? 'Discovery' : 'Deezcord'}
                     </h2>
                   </div>
                 )}
              </div>

              {currentRoom?.isMember && !isDiscoveryMode && (
                <button
                  onClick={() => isSettingsView ? navigate(`/${generateSlug(currentRoom.name)}`, { state: { roomId: currentRoom.id, channelId: currentChannel?.id } }) : navigate(`/${generateSlug(currentRoom.name)}/settings`, { state: { roomId: currentRoom.id } })}
                  className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-300 ${
                    isSettingsView 
                      ? 'bg-blue-500 border-blue-500 text-white shadow-md' 
                      : 'bg-white/50 dark:bg-slate-700/50 border-slate-200/50 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:scale-105'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}
            </header>

            {/* Desktop Header */}
            <header className="hidden md:flex h-20 items-center justify-between px-8 bg-transparent z-10">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-sm shadow-blue-500/20 overflow-hidden ${
                  currentRoom?.room_profile ? '' : 'bg-blue-500'
                }`}>
                  {currentRoom?.room_profile ? (
                    <img src={currentRoom.room_profile} alt={`${currentRoom.name} profile`} className="w-full h-full object-cover" />
                  ) : (
                    <span>#</span>
                  )}
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                    {isDiscoveryMode ? 'Discover Rooms' : (currentRoom ? currentRoom.name : 'Select a Room')}
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    {isDiscoveryMode ? 'Find new communities to join' : (currentRoom ? (currentRoom.isMember ? (
                      <>
                        <span>Chatting in</span>
                        {currentChannel && (
                          <span className="font-semibold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded">#{currentChannel.name}</span>
                        )}
                      </>
                    ) : `Not a member of ${currentRoom.name}`) : 'Join the conversation')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                {!isDiscoveryMode && currentRoom?.isMember && members.length > 0 && (
                  <div className="group relative">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm cursor-help transition-all hover:bg-emerald-500/20">
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
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 font-bold text-sm ${
                      isSettingsView 
                        ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/30' 
                        : 'bg-white/50 dark:bg-slate-800/50 border-slate-200/50 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md'
                    }`}
                  >
                    <svg className={`w-4 h-4 transition-transform duration-500 ${isSettingsView ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {isSettingsView ? 'Back to Chat' : 'Settings'}
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
