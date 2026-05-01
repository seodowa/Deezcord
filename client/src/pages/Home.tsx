import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import CreateRoomModal from '../components/CreateRoomModal';
import AsyncButton from '../components/AsyncButton';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import type { Room, Member } from '../types/room';
import type { Message } from '../types/message';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { getRooms, createRoom, joinRoom, getRoomMembers, getDiscoverRooms, getMessages } from '../services/roomService';

export default function HomePage() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [roomMembers, setRoomMembers] = useState<Member[]>([]);
  const [isJoining, setIsJoining] = useState(false);
  const [isDiscoveryMode, setIsDiscoveryMode] = useState(false);
  const [discoverRooms, setDiscoverRooms] = useState<Room[]>([]);
  const [isLoadingDiscover, setIsLoadingDiscover] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const { addToast } = useToast();
  const { logout, user } = useAuth();
  const { joinRoom: socketJoinRoom, sendMessage, onMessage } = useSocket();

  const fetchRooms = useCallback(async () => {
    try {
      const data = await getRooms();
      setRooms(data);
    } catch (err) {
      const error = err as Error;
      addToast(error.message || 'Failed to load rooms', 'error');
    } finally {
      setIsLoadingRooms(false);
    }
  }, [addToast]);

  const fetchDiscoverRooms = useCallback(async () => {
    setIsLoadingDiscover(true);
    try {
      const data = await getDiscoverRooms();
      setDiscoverRooms(data);
    } catch (err) {
      console.error('Failed to load discovery rooms:', err);
    } finally {
      setIsLoadingDiscover(false);
    }
  }, []);

  const fetchMembers = useCallback(async (roomId: string) => {
    try {
      const members = await getRoomMembers(roomId);
      setRoomMembers(members);
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  }, []);

  const fetchMessages = useCallback(async (roomId: string) => {
    try {
      const data = await getMessages(roomId);
      setMessages(data.messages);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }, []);

  useEffect(() => {
    if (currentRoom?.isMember) {
      fetchMembers(currentRoom.id);
      fetchMessages(currentRoom.id);
      socketJoinRoom(currentRoom.id);
    } else {
      setRoomMembers([]);
      setMessages([]);
    }
  }, [currentRoom, fetchMembers, fetchMessages, socketJoinRoom]);

  useEffect(() => {
    const unsubscribe = onMessage((newMessage) => {
      if (newMessage.room_id === currentRoom?.id) {
        setMessages(prev => {
          // Check if message already exists (e.g. from optimistic update)
          const exists = prev.some(m => m.id === newMessage.id);
          if (exists) return prev;
          
          return [...prev, {
            ...newMessage,
            id: newMessage.id || Date.now().toString(),
            created_at: newMessage.created_at || new Date().toISOString()
          }];
        });
      }
    });
    return unsubscribe;
  }, [onMessage, currentRoom]);

  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setTimeout(() => setIsDarkMode(true), 0);
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      setTimeout(() => setIsDarkMode(false), 0);
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }

    void (async () => {
      await fetchRooms();
    })();
  }, [fetchRooms]);

  const handleSelectRoom = (room: Room) => {
    setCurrentRoom(room);
    setIsDiscoveryMode(false);
    setIsMobileMenuOpen(false);
  };

  const handleDiscoverRoom = () => {
    setIsDiscoveryMode(true);
    setCurrentRoom(null);
    setIsMobileMenuOpen(false);
    fetchDiscoverRooms();
  };

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleCreateRoom = async (name: string) => {
    setIsCreatingRoom(true);
    try {
      const newRoom = await createRoom(name);
      const roomWithMembership = { ...newRoom, isMember: true, role: 'owner' };
      setRooms(prev => [...prev, roomWithMembership]);
      setCurrentRoom(roomWithMembership);
      addToast(`Room "${name}" created successfully!`, 'success');
      setIsCreateModalOpen(false);
    } catch (err) {
      const error = err as Error;
      addToast(error.message || 'Failed to create room', 'error');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleJoinRoom = async (roomToJoin?: Room) => {
    const room = roomToJoin || currentRoom;
    if (!room) return;

    setIsJoining(true);
    try {
      await joinRoom(room.id);
      const updatedRoom: Room = { ...room, isMember: true, role: 'member' };
      
      if (isDiscoveryMode) {
        setRooms(prev => [...prev, updatedRoom]);
        setDiscoverRooms(prev => prev.filter(r => r.id !== room.id));
      } else {
        setRooms(prev => prev.map(r => r.id === room.id ? updatedRoom : r));
      }
      
      setCurrentRoom(updatedRoom);
      setIsDiscoveryMode(false);
      addToast(`Joined room "${room.name}"`, 'success');
    } catch (err) {
      const error = err as Error;
      addToast(error.message || 'Failed to join room', 'error');
    } finally {
      setIsJoining(false);
    }
  };

  const handleSendMessage = (content: string) => {
    if (currentRoom && currentRoom.isMember) {
      sendMessage({ room_id: currentRoom.id, content });
      
      // Optimistic update
      const tempId = `temp-${Date.now()}`;
      const newMessage: Message = {
        id: tempId,
        room_id: currentRoom.id,
        username: user?.email.split('@')[0] || 'Me',
        content,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, newMessage]);
    }
  };

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  const handleLogout = async () => {
    await new Promise(resolve => setTimeout(resolve, 600));
    logout();
    addToast('You have been signed out.', 'info');
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-950 relative overflow-hidden font-sans text-slate-900 dark:text-slate-50 transition-colors duration-500">
      
      <div className="absolute top-[10%] left-[20%] w-[400px] h-[400px] bg-blue-500/30 dark:bg-blue-500/15 rounded-full blur-[80px] z-0 animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-[10%] right-[20%] w-[350px] h-[350px] bg-purple-500/30 dark:bg-purple-500/15 rounded-full blur-[80px] z-0 animate-pulse pointer-events-none" style={{ animationDelay: '2s' }}></div>

      <Sidebar 
        rooms={rooms}
        currentRoomId={currentRoom?.id}
        isDarkMode={isDarkMode}
        mounted={mounted}
        isOpen={isMobileMenuOpen}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        onClose={() => setIsMobileMenuOpen(false)}
        onSelectRoom={handleSelectRoom}
        onCreateRoom={handleOpenCreateModal}
        onDiscoverRoom={handleDiscoverRoom}
        isLoadingRooms={isLoadingRooms}
        isCreatingRoom={isCreatingRoom}
      />

      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateRoom}
      />

      <main className="flex-1 relative flex flex-col z-10 w-full md:w-auto md:bg-white/40 md:dark:bg-slate-800/40 md:backdrop-blur-md">
        
        <header className="h-16 border-b border-slate-200/50 dark:border-white/10 flex items-center justify-between px-4 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md md:hidden z-20 sticky top-0">
          <div className="flex items-center gap-3">
             <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white/50 dark:bg-slate-700/50 border border-slate-200/50 dark:border-white/10 hover:scale-105 hover:shadow-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                aria-label="Open menu"
             >
                <svg className="w-5 h-5 text-slate-700 dark:text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
             </button>
             <h2 className="text-lg font-extrabold tracking-tight text-blue-500 dark:text-blue-400">Deezcord</h2>
          </div>
        </header>

        <header className="hidden md:flex h-20 items-center justify-between px-8 bg-transparent z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white font-bold text-xl shadow-sm shadow-blue-500/20">
              #
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                {isDiscoveryMode ? 'Discover Rooms' : (currentRoom ? currentRoom.name : 'Select a Room')}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isDiscoveryMode ? 'Find new communities to join' : (currentRoom ? (currentRoom.isMember ? `Chatting in ${currentRoom.name}` : `Not a member of ${currentRoom.name}`) : 'Join the conversation')}
              </p>
            </div>
          </div>
          
          {!isDiscoveryMode && currentRoom?.isMember && roomMembers.length > 0 && (
            <div className="flex -space-x-2 overflow-hidden">
              {roomMembers.slice(0, 5).map((member) => (
                <div 
                  key={member.user_id} 
                  className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-800 bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold"
                  title={member.profiles.username}
                >
                  {member.profiles.username.substring(0, 2).toUpperCase()}
                </div>
              ))}
              {roomMembers.length > 5 && (
                <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-800 bg-slate-100 dark:bg-slate-600 flex items-center justify-center text-xs font-bold">
                  +{roomMembers.length - 5}
                </div>
              )}
            </div>
          )}
        </header>

        <div className="flex-1 flex flex-col bg-white/50 dark:bg-slate-950/50 md:rounded-tl-[2.5rem] border-t border-slate-200/50 dark:border-white/10 md:border-l overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            {isDiscoveryMode ? (
              <div className="flex-1 p-6 md:p-8 overflow-y-auto">
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
                      {discoverRooms.map(room => (
                        <div key={room.id} className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                          <div>
                            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-xl mb-4 shadow-sm">#</div>
                            <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-slate-50">{room.name}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Join this room to start chatting with its members.</p>
                          </div>
                          <AsyncButton
                            onClick={() => handleJoinRoom(room)}
                            isLoading={isJoining}
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
              </div>
            ) : currentRoom ? (
               currentRoom.isMember ? (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <MessageList messages={messages} currentUserEmail={user?.email} />
                    <MessageInput onSendMessage={handleSendMessage} />
                  </div>
               ) : (
                  <div className="flex-1 flex items-center justify-center p-6 md:p-8">
                    <div className="max-w-md w-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-3xl p-8 text-center shadow-xl animate-fade-in-up">
                      <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl mx-auto mb-6 flex items-center justify-center text-3xl">
                        🔒
                      </div>
                      <h2 className="text-2xl font-extrabold mb-2 tracking-tight text-slate-900 dark:text-slate-50">Private Room</h2>
                      <p className="text-slate-500 dark:text-slate-400 mb-8">
                        You are not a member of <strong>#{currentRoom.name}</strong>. Join the room to see messages and participate in the conversation.
                      </p>
                      <AsyncButton
                        onClick={() => handleJoinRoom()}
                        isLoading={isJoining}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-3 font-bold shadow-lg shadow-blue-500/30 transition-all duration-300"
                      >
                        Join Room
                      </AsyncButton>
                    </div>
                  </div>
               )
            ) : (
               <div className="flex-1 flex items-center justify-center p-6 md:p-8">
                 <div className="max-w-2xl w-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-3xl p-8 md:p-12 text-center shadow-2xl animate-fade-in-up">
                   <div className="w-20 h-20 md:w-24 md:h-24 bg-blue-500 rounded-3xl mx-auto mb-6 md:mb-8 flex items-center justify-center text-4xl md:text-5xl shadow-lg shadow-blue-500/30 ring-4 ring-blue-500/20">
                     👋
                   </div>
                   <h2 className="text-2xl md:text-4xl font-extrabold mb-4 tracking-tight text-slate-900 dark:text-slate-50">Welcome to Deezcord</h2>
                   <p className="text-sm md:text-lg text-slate-500 dark:text-slate-400 mb-8 md:mb-10 leading-relaxed">
                     You've successfully joined the community! Select a room from the sidebar to start chatting or create a new one to invite your friends.
                   </p>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div className="p-5 md:p-6 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-white/5 text-left shadow-sm transition-transform hover:-translate-y-1 duration-300">
                         <div className="w-10 h-10 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-500 mb-4 text-xl">⚡</div>
                         <h3 className="font-bold mb-2 text-slate-900 dark:text-slate-50">Real-time Chat</h3>
                         <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Powered by WebSockets for instant, low-latency messaging across all active rooms.</p>
                      </div>
                      <div className="p-5 md:p-6 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-white/5 text-left shadow-sm transition-transform hover:-translate-y-1 duration-300">
                         <div className="w-10 h-10 bg-purple-500/10 dark:bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-500 mb-4 text-xl">🔒</div>
                         <h3 className="font-bold mb-2 text-slate-900 dark:text-slate-50">Safe & Secure</h3>
                         <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Protected by Supabase Authentication ensuring your data and identity remain private.</p>
                      </div>
                   </div>
                 </div>
               </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
