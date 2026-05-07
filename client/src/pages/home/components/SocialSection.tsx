import type { User } from '../../../types/user';
import AsyncButton from '../../../components/AsyncButton';

interface SocialSectionProps {
  user: User | null;
  onLogout: () => Promise<void>;
  onOpenProfile: () => void;
  friendsList: User[];
  pendingList: User[];
  isLoadingFriends: boolean;
  onAcceptRequest: (id: string) => Promise<void>;
  onDeclineRequest: (id: string) => Promise<void>;
  onUserClick: (user: { id: string; username: string; avatar_url?: string | null }) => void;
  onNavigate: (path: string, state?: any) => void;
}

export default function SocialSection({
  user,
  onLogout,
  onOpenProfile,
  friendsList,
  pendingList,
  isLoadingFriends,
  onAcceptRequest,
  onDeclineRequest,
  onUserClick,
  onNavigate
}: SocialSectionProps) {
  return (
    <div className="flex flex-col h-[600px] max-h-[80vh] rounded-l-[2.5rem] bg-white/60 dark:bg-slate-800/60 backdrop-blur-3xl border border-slate-200/50 dark:border-white/10 border-r-0 shadow-2xl shadow-slate-900/5 overflow-hidden">
      {/* User Profile Header - Minimalist Flush Design */}
      <div className="px-6 py-5 flex items-center justify-between group/profile shrink-0 border-b border-slate-200/50 dark:border-white/5">
        <button 
          onClick={onOpenProfile}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left min-w-0 flex-1"
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
              {user?.username || user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-tighter">
              Online
            </p>
          </div>
        </button>
        
        <div className="flex items-center gap-1 ml-2">
          <AsyncButton
            onClick={onLogout}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all hover:scale-105 active:scale-95"
            title="Logout"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </AsyncButton>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-none p-6 pt-6 space-y-8">
        {/* Pending Requests Container */}
        {pendingList.length > 0 && (
          <div className="space-y-4 animate-fade-in-up">
            <h4 className="text-[10px] font-extrabold text-orange-500 uppercase tracking-[0.2em] flex items-center gap-2 px-1">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
              Requests ({pendingList.length})
            </h4>
            <div className="space-y-3">
              {pendingList.map(request => (
                <div key={request.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-white/5 shadow-sm">
                  <div 
                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-bold text-sm shadow-sm overflow-hidden cursor-pointer shrink-0"
                    onClick={() => onUserClick({ id: request.id, username: request.username, avatar_url: request.avatar_url })}
                  >
                    {request.avatar_url ? (
                      <img src={request.avatar_url} alt={request.username} className="w-full h-full object-cover" />
                    ) : (
                      <span>{(request.username || 'U').substring(0, 1).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{request.username}</p>
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">Wants to connect</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onAcceptRequest(request.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 shadow-md transition-transform hover:scale-105 active:scale-95"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDeclineRequest(request.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-red-500 hover:text-white transition-all hover:scale-105 active:scale-95"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends List Container */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Active Friends</h4>
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {friendsList.filter(f => f.isOnline).length} Online
            </span>
          </div>

          <div className="space-y-1">
            {isLoadingFriends ? (
              [1,2,3,4].map(i => (
                <div key={i} className="h-14 bg-white/20 dark:bg-slate-700/20 rounded-2xl animate-pulse mx-1"></div>
              ))
            ) : friendsList.length > 0 ? (
              [...friendsList].sort((a, b) => (a.isOnline === b.isOnline) ? 0 : a.isOnline ? -1 : 1).map(friend => (
                <div 
                  key={friend.id} 
                  onClick={() => onUserClick({ id: friend.id, username: friend.username, avatar_url: friend.avatar_url })}
                  className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/60 dark:hover:bg-slate-700/40 transition-all cursor-pointer group border border-transparent hover:border-slate-200/50 dark:hover:border-white/5"
                >
                  <div className="relative flex-shrink-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm overflow-hidden ${friend.isOnline ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 'bg-gradient-to-br from-slate-400 to-slate-600'}`}>
                      {friend.avatar_url ? (
                        <img src={friend.avatar_url} alt={friend.username} className="w-full h-full object-cover" />
                      ) : (
                        <span>{(friend.username || 'U').substring(0, 1).toUpperCase()}</span>
                      )}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${friend.isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-500 transition-colors">{friend.username}</p>
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate uppercase tracking-widest">{friend.isOnline ? 'Online' : 'Offline'}</p>
                  </div>
                  <button className="w-8 h-8 rounded-xl bg-slate-100/50 dark:bg-slate-800/50 flex items-center justify-center text-slate-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-500 hover:text-white">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </button>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-center p-6 bg-white/20 dark:bg-slate-900/20 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-xl mb-3">👋</div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-50">It's quiet here</p>
                <p className="text-[10px] text-slate-500 mt-1">Add friends to start chatting!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
