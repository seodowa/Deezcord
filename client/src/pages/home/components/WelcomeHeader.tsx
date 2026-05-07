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

    </header>
  );
}
