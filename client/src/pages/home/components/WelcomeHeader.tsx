import type { User } from '../../../types/user';

interface WelcomeHeaderProps {
  user: User | null;
  roomCount: number;
  isNewUser: boolean;
}

export default function WelcomeHeader({ user, roomCount, isNewUser }: WelcomeHeaderProps) {
  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const displayName = user?.username || user?.email?.split('@')[0] || 'User';

  return (
    <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
      <div className="space-y-2">
        <h2 className="text-sm font-extrabold text-blue-500 dark:text-blue-400 uppercase tracking-[0.2em]">
          Dashboard
        </h2>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
          {isNewUser ? (
            <>Welcome to <span className="text-blue-600 dark:text-blue-400">Deezcord</span>, {displayName}</>
          ) : (
            <>{getTimeGreeting()}, <span className="text-blue-600 dark:text-blue-400">{displayName}</span></>
          )}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium max-w-lg">
          {isNewUser ? (
            "Your open channel for real-time communication. Start by joining a community or creating your own."
          ) : (
            <>It's great to see you again! You have <span className="text-slate-900 dark:text-slate-200 font-bold">{roomCount} rooms</span> active right now.</>
          )}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative group">
          <input 
            type="text" 
            placeholder="Find people..." 
            className="w-full md:w-64 px-5 py-3 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm font-medium transition-all group-hover:bg-white dark:group-hover:bg-slate-800 shadow-sm"
          />
          <svg className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
    </header>
  );
}
