import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import type { Room } from '../types/room';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { getRooms, createRoom } from '../services/roomService';

export default function HomePage() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  
  const { addToast } = useToast();
  const { logout } = useAuth();

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
    setIsMobileMenuOpen(false);
  };

  const handleCreateRoom = async () => {
    const name = prompt('Enter room name:');
    if (!name) return;

    try {
      const newRoom = await createRoom(name);
      setRooms(prev => [...prev, newRoom]);
      setCurrentRoom(newRoom);
      addToast(`Room "${name}" created successfully!`, 'success');
    } catch (err) {
      const error = err as Error;
      addToast(error.message || 'Failed to create room', 'error');
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
    // Simulate async logout for UI feedback
    await new Promise(resolve => setTimeout(resolve, 600));
    logout();
    addToast('You have been signed out.', 'info');
    // Force a full reload to reset App.tsx state completely
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-950 relative overflow-hidden font-sans text-slate-900 dark:text-slate-50 transition-colors duration-500">
      
      {/* Background Blobs for Visual Aesthetics (Matched with Login/Register) */}
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
        onCreateRoom={handleCreateRoom}
        isLoadingRooms={isLoadingRooms}
      />

      {/* Main Content - Provides the shell background for the Header and the space behind the Content Tray's corner */}
      <main className="flex-1 relative flex flex-col z-10 w-full md:w-auto md:bg-white/40 md:dark:bg-slate-800/40 md:backdrop-blur-md">
        
        {/* Mobile Header - Visible only on small screens */}
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

        {/* Desktop Header - Transparent as it uses the main container's background */}
        <header className="hidden md:flex h-20 items-center px-8 bg-transparent z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white font-bold text-xl shadow-sm shadow-blue-500/20">
              #
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                {currentRoom ? currentRoom.name : 'Select a Room'}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {currentRoom ? `Chatting in ${currentRoom.name}` : 'Join the conversation'}
              </p>
            </div>
          </div>
        </header>

        {/* Welcome Message Area - "Tray" Container for content */}
        <div className="flex-1 flex flex-col bg-white/50 dark:bg-slate-950/50 md:rounded-tl-[2.5rem] border-t border-slate-200/50 dark:border-white/10 md:border-l overflow-hidden">
          <div className="flex-1 flex items-center justify-center p-6 md:p-8 overflow-y-auto">
            {currentRoom ? (
               <div className="text-center animate-fade-in">
                  <h2 className="text-4xl font-extrabold mb-4"># {currentRoom.name}</h2>
                  <p className="text-slate-500">Messages will appear here once implemented.</p>
               </div>
            ) : (
               /* Glassmorphic Card (Matches Login Card) */
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
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
