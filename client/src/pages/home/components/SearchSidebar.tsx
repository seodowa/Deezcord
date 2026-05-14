import { useState } from 'react';
import type { User } from '../../../types/user';
import AsyncButton from '../../../components/AsyncButton';

interface SearchSidebarProps {
  onSearch: (query: string) => void;
  onNavigate: (path: string) => void;
  results: User[];
  isLoading: boolean;
  onUserClick: (user: { id: string; username: string; avatar_url?: string | null }) => void;
  searchQuery: string;
}

export default function SearchSidebar({ 
  onSearch, 
  results, 
  isLoading, 
  onUserClick,
  searchQuery 
}: SearchSidebarProps) {
  const [localQuery, setLocalQuery] = useState(searchQuery);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(localQuery);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto scrollbar-none p-6 space-y-6 flex flex-col">
        {/* Search Input Section */}
        <form onSubmit={handleSearch} className="relative group shrink-0">
          <input
            type="text"
            value={localQuery}
            onChange={(e) => {
              setLocalQuery(e.target.value);
            }}
            placeholder="Search by username..."
            className="w-full bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-white/5 rounded-2xl px-5 py-3.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <AsyncButton 
              type="submit"
              isLoading={isLoading}
              className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-transform"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </AsyncButton>
          </div>
        </form>

        {/* Results Area */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-white/20 dark:bg-slate-700/20 rounded-2xl animate-pulse"></div>
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-1">
              <h4 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1 mb-3">Search Results</h4>
              {results.map(user => (
                <div 
                  key={user.id} 
                  onClick={() => onUserClick({ id: user.id, username: user.username, avatar_url: user.avatar_url })}
                  className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/60 dark:hover:bg-slate-700/40 transition-all cursor-pointer group border border-transparent hover:border-slate-200/50 dark:hover:border-white/5"
                >
                  <div className="relative shrink-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm overflow-hidden ${user.isOnline ? 'bg-linear-to-br from-emerald-400 to-emerald-600' : 'bg-linear-to-br from-slate-400 to-slate-600'}`}>
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                      ) : (
                        <span>{(user.username || 'U').substring(0, 1).toUpperCase()}</span>
                      )}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${user.isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-500 transition-colors">{user.username}</p>
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate uppercase tracking-widest">{user.isOnline ? 'Online' : 'Offline'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-xl mb-3">🔍</div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-50">No users found</p>
              <p className="text-[10px] text-slate-500 mt-1">Try a different username</p>
            </div>
          ) : null}
        </div>

        {/* Bottom Tip Section - Not a footer, but pushed to bottom of content flow */}
        <div className="mt-auto pt-6">
          <div className="p-4 rounded-3xl bg-emerald-500/5 border border-emerald-500/10">
            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2">Pro Tip</p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              Send friend requests to users you meet in public rooms to keep the conversation going!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
