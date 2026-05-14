import { useRef, useState, useEffect } from 'react';
import type { NavigateOptions } from 'react-router-dom';
import type { Room } from '../../../types/room';
import { generateSlug } from '../../../utils/slug';

interface RecentRoomsProps {
  rooms: Room[];
  isLoading: boolean;
  onNavigate: (path: string, options?: NavigateOptions) => void;
}

export default function RecentRooms({ rooms, isLoading, onNavigate }: RecentRoomsProps) {
  const recentRooms = rooms.slice(0, 10);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 20);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 20);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll);
      // Initial check
      handleScroll();
      return () => el.removeEventListener('scroll', handleScroll);
    }
  }, [isLoading, rooms]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current;
      const scrollAmount = direction === 'left' ? -clientWidth * 0.8 : clientWidth * 0.8;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">Recent Rooms</h3>
      </div>
      
      <div className="relative group/carousel -mx-4 px-4">
        {/* Navigation Arrows */}
        {showLeftArrow && (
          <button 
            onClick={() => scroll('left')}
            className="absolute left-2 top-[calc(50%-12px)] -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:scale-110 active:scale-95 transition-all cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        
        {showRightArrow && recentRooms.length > 0 && (
          <button 
            onClick={() => scroll('right')}
            className="absolute right-2 top-[calc(50%-12px)] -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:scale-110 active:scale-95 transition-all cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        <div 
          ref={scrollRef}
          className="flex overflow-x-auto gap-6 pb-10 pt-4 scrollbar-none snap-x snap-mandatory relative"
        >
          {isLoading ? (
            [1,2,3,4,5].map(i => (
              <div key={i} className="w-48 h-48 shrink-0 rounded-[2.5rem] bg-white/40 dark:bg-slate-800/40 animate-pulse border border-slate-200/50 dark:border-white/10"></div>
            ))
          ) : recentRooms.length > 0 ? (
            recentRooms.map((room) => (
              <button
                key={room.id}
                onClick={() => onNavigate(`/${generateSlug(room.name)}`, { state: { roomId: room.id } })}
                className="group relative w-48 h-48 shrink-0 flex flex-col justify-end p-6 rounded-[2.5rem] bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 shadow-sm hover:shadow-2xl hover:bg-white dark:hover:bg-slate-800 hover:-translate-y-2 transition-all duration-500 text-left overflow-hidden snap-start cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 group-hover:from-blue-500/10 group-hover:to-indigo-500/10 transition-colors"></div>
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                
                <div className="relative z-10 space-y-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl overflow-hidden shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ${room.room_profile ? '' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                    {room.room_profile ? (
                      <img src={room.room_profile} alt={room.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{room.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-slate-50 truncate group-hover:text-blue-500 transition-colors text-base leading-tight">
                      {room.name}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Active</span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="flex-1 min-h-[192px] rounded-[2.5rem] bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-dashed border-slate-300 dark:border-slate-700 text-center flex flex-col items-center justify-center p-8">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-xl mb-3">🏠</div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50">No rooms yet</h4>
              <p className="text-[10px] text-slate-500 font-medium mt-1">Start by discovering communities.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
