import AsyncButton from './AsyncButton';
import type { User } from '../types/user';

interface UserProfilePillProps {
  user: User | null;
  onOpenProfile: () => void;
  onLogout: () => Promise<void>;
}

export default function UserProfilePill({ user, onOpenProfile, onLogout }: UserProfilePillProps) {
  return (
    <div className="fixed top-4 right-4 md:top-5 md:right-8 z-50 hidden sm:flex items-center gap-3 p-1.5 pr-3 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 shadow-lg shadow-blue-500/5 transition-all hover:scale-[1.02] hover:bg-white dark:hover:bg-slate-800 active:scale-[0.98]">
      <button 
        onClick={onOpenProfile}
        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
      >
        <div className="relative">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-md overflow-hidden">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span>{(user?.username || user?.email || 'U').substring(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-3 h-3 md:w-3.5 md:h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800 shadow-sm" />
        </div>
        <div className="hidden lg:block text-left">
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[120px]">
            {user?.username || user?.email?.split('@')[0]}
          </p>
          <p className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-tighter">
            Online
          </p>
        </div>
      </button>
      <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
      <AsyncButton
        onClick={onLogout}
        className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
        title="Logout"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </AsyncButton>
    </div>
  );
}
