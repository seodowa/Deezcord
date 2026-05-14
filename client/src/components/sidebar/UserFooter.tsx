import AsyncButton from '../AsyncButton';
import type { User } from '../../types/user';

interface UserFooterProps {
  user: User | null;
  mounted: boolean;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onLogout: () => Promise<void>;
  onOpenProfile: () => void;
}

export default function UserFooter({
  user,
  mounted,
  isDarkMode,
  onToggleTheme,
  onLogout,
  onOpenProfile
}: UserFooterProps) {
  return (
    <div className="py-3 px-4 bg-slate-50/30 dark:bg-black/10">
      <div className="flex items-center justify-between px-3 py-2 rounded-[1.25rem] bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/5 shadow-sm group/profile">
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-80 transition-opacity cursor-pointer text-left"
        >
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-md overflow-hidden ring-2 ring-white/10 transition-transform group-hover/profile:scale-105">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span>{(user?.username || user?.email || 'U').substring(0, 1).toUpperCase()}</span>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800 shadow-sm" />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {user?.username || user?.email?.split('@')[0]}
            </p>
            <p className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-tighter">
              Online
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1 ml-2">
          {mounted && (
            <button
              onClick={onToggleTheme}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
          )}
          <AsyncButton
            onClick={onLogout}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="Logout"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </AsyncButton>
        </div>
      </div>
    </div>
  );
}
