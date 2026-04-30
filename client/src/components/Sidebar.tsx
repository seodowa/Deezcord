import { useState } from 'react';
import AsyncButton from './AsyncButton';
import type { Room } from '../types/room';

export interface SidebarProps {
  rooms: Room[];
  currentRoomId?: string;
  isDarkMode: boolean;
  mounted: boolean;
  isOpen: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
  onClose: () => void;
  onSelectRoom: (room: Room) => void;
  onCreateRoom: () => void;
  onDiscoverRoom: () => void;
  isLoadingRooms: boolean;
  isCreatingRoom: boolean;
}

export default function Sidebar({
  rooms,
  currentRoomId,
  isDarkMode,
  mounted,
  isOpen,
  onToggleTheme,
  onLogout,
  onClose,
  onSelectRoom,
  onCreateRoom,
  onDiscoverRoom,
  isLoadingRooms,
  isCreatingRoom
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      {/* Mobile Backdrop Overlay - Soft fade-in, click to close */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden transition-opacity duration-500 ease-out"
          onClick={onClose}
          aria-label="Close Sidebar"
        ></div>
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col shadow-xl md:shadow-none transition-all duration-300 ease-out md:relative ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 w-72 ${isCollapsed ? 'md:w-20' : 'md:w-72'} bg-white/70 dark:bg-slate-800/60 backdrop-blur-md md:bg-white/40 md:dark:bg-slate-800/40`}
      >
        {/* Header Section */}
        <div className={`h-20 flex items-center transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'justify-between px-6'}`}>
          
          {/* Logo */}
          {!isCollapsed && (
            <h2 className="text-xl font-extrabold tracking-tight text-blue-500 dark:text-blue-400 truncate">
              Deezcord
            </h2>
          )}
          
          <div className="flex items-center gap-2">
             {/* Desktop Collapse Toggle */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex w-10 h-10 rounded-full items-center justify-center bg-white/50 dark:bg-slate-700/50 border border-slate-200/50 dark:border-white/10 hover:scale-105 hover:shadow-md transition-all duration-300 text-slate-500 dark:text-slate-400 flex-shrink-0"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
               {isCollapsed ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
               ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
                  </svg>
               )}
            </button>

             {/* Mobile Close Button */}
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white/50 dark:bg-slate-700/50 border border-slate-200/50 dark:border-white/10 hover:scale-105 hover:shadow-md transition-all duration-300 md:hidden text-slate-500 dark:text-slate-400 flex-shrink-0"
              aria-label="Close menu"
            >
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
               </svg>
            </button>

            {/* Theme Toggle Button */}
            {mounted && !isCollapsed && (
              <button
                onClick={onToggleTheme}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white/50 dark:bg-slate-700/50 border border-slate-200/50 dark:border-white/10 hover:scale-105 hover:shadow-md transition-all duration-300 text-slate-900 dark:text-slate-50 flex-shrink-0"
                aria-label="Toggle Dark Mode"
                title="Toggle Dark Mode"
              >
                {isDarkMode ? (
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 17C14.7614 17 17 14.7614 17 12C17 9.23858 14.7614 7 12 7C9.23858 7 7 9.23858 7 12C7 14.7614 9.23858 17 12 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 1V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 21V23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M4.22 4.22L5.64 5.64" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M18.36 18.36L19.78 19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M1 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21 12H23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M4.22 19.78L5.64 18.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M18.36 5.64L19.78 4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Rooms List Section */}
        <div className={`flex-1 overflow-y-auto p-4 space-y-2 ${isCollapsed ? 'md:flex md:flex-col md:items-center md:px-2' : ''}`}>
          <div className={`text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 mb-2 ${isCollapsed ? 'md:hidden' : ''}`}>
            Your Rooms
          </div>

          {isLoadingRooms ? (
            <div className="space-y-2 animate-pulse px-2">
              <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-xl w-full"></div>
              <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-xl w-full"></div>
              <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-xl w-full"></div>
            </div>
          ) : (
            <>
              {rooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => onSelectRoom(room)}
                  className={`text-left rounded-xl transition-all duration-200 group flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500/50 px-3 py-2 w-full gap-3 ${
                    currentRoomId === room.id 
                    ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' 
                    : 'bg-transparent hover:bg-white/50 dark:hover:bg-slate-700/50 border border-slate-200/50 dark:hover:border-white/10 text-slate-700 dark:text-slate-200'
                  } ${isCollapsed ? 'md:justify-center md:p-2 md:w-12 md:h-12 md:shrink-0' : ''}`}
                  title={isCollapsed ? room.name : undefined}
                >
                  <div className={`w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center font-bold transition-colors duration-200 ${
                    currentRoomId === room.id
                    ? 'bg-white/20 text-white'
                    : 'bg-blue-500/10 dark:bg-blue-400/10 text-blue-500 dark:text-blue-400 group-hover:bg-blue-500 group-hover:text-white dark:group-hover:bg-blue-500 dark:group-hover:text-white'
                  }`}>
                    {room.isMember ? '#' : '🔒'}
                  </div>
                  <div className={`flex-1 min-w-0 ${isCollapsed ? 'md:hidden' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-medium transition-colors duration-200 truncate ${currentRoomId === room.id ? 'text-white' : ''}`}>
                        {room.name}
                      </span>
                      {room.isMember && room.role === 'owner' && !isCollapsed && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tight ${currentRoomId === room.id ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-500'}`}>
                          Owner
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
          
          <AsyncButton 
            onClick={onCreateRoom}
            isLoading={isCreatingRoom}
            className={`rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-all duration-200 flex items-center bg-transparent hover:bg-blue-50/50 dark:hover:bg-blue-900/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 mt-4 px-3 py-2 w-full gap-3 text-left ${isCollapsed ? 'md:justify-center md:mt-2 md:p-2 md:w-12 md:h-12 md:shrink-0' : ''}`}
            title={isCollapsed ? "Create Room" : undefined}
          >
             <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center text-xl transition-colors duration-200">+</div>
             <span className={`font-medium transition-colors duration-200 truncate ${isCollapsed ? 'md:hidden' : ''}`}>Create Room</span>
          </AsyncButton>

          <button 
            onClick={onDiscoverRoom}
            className={`rounded-xl border border-transparent text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-all duration-200 flex items-center bg-white/50 dark:bg-slate-700/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 mt-2 px-3 py-2 w-full gap-3 text-left ${isCollapsed ? 'md:justify-center md:mt-2 md:p-2 md:w-12 md:h-12 md:shrink-0' : ''}`}
            title={isCollapsed ? "Discover Rooms" : undefined}
          >
             <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center text-xl transition-colors duration-200">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
               </svg>
             </div>
             <span className={`font-medium transition-colors duration-200 truncate ${isCollapsed ? 'md:hidden' : ''}`}>Discover Rooms</span>
          </button>
        </div>

        {/* Footer Section (Sign Out) */}
        <div className={`p-4 border-t border-slate-200/50 dark:border-white/10 flex ${isCollapsed ? 'md:justify-center md:px-2' : ''}`}>
          <AsyncButton
            onClick={onLogout}
            className={`bg-white/50 dark:bg-slate-700/50 hover:bg-red-500/90 dark:hover:bg-red-500/90 text-red-500 dark:text-red-400 hover:text-white dark:hover:text-white rounded-xl font-semibold border border-red-100 dark:border-red-900/30 hover:border-transparent transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-500/50 flex items-center justify-center w-full px-4 py-2.5 gap-2 ${isCollapsed ? 'md:w-12 md:h-12 md:px-0 md:py-0 md:shrink-0' : ''}`}
            title={isCollapsed ? "Sign Out" : undefined}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className={`truncate ${isCollapsed ? 'md:hidden' : ''}`}>Sign Out</span>
          </AsyncButton>
        </div>
      </aside>
    </>
  );
}
