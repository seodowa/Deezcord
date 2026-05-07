import type { Room } from '../../../types/room';
import { generateSlug } from '../../../utils/slug';

interface RecentHubsProps {
  rooms: Room[];
  isLoading: boolean;
  onNavigate: (path: string, state?: any) => void;
}

export default function RecentHubs({ rooms, isLoading, onNavigate }: RecentHubsProps) {
  const recentRooms = rooms.slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">Recent Hubs</h3>
        <button className="text-sm font-bold text-blue-500 hover:underline">View All</button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {isLoading ? (
          [1,2,3,4].map(i => (
            <div key={i} className="h-32 rounded-[2rem] bg-white/40 dark:bg-slate-800/40 animate-pulse border border-slate-200/50 dark:border-white/10"></div>
          ))
        ) : recentRooms.length > 0 ? (
          recentRooms.map((room) => (
            <button
              key={room.id}
              onClick={() => onNavigate(`/${generateSlug(room.name)}`, { state: { roomId: room.id } })}
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
      
      {/* Feature Highlights (Consistent regardless of loading/data) */}
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
  );
}
