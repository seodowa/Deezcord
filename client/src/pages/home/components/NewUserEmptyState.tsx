interface NewUserEmptyStateProps {
  onDiscover: () => void;
  onCreateRoom: () => void;
}

export default function NewUserEmptyState({ onDiscover, onCreateRoom }: NewUserEmptyStateProps) {
  return (
    <div className="p-8 md:p-12 rounded-[3rem] bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-dashed border-slate-300 dark:border-white/10 flex flex-col items-center justify-center text-center space-y-8 animate-fade-in">
      <div className="relative">
        <div className="w-24 h-24 bg-blue-500/10 dark:bg-blue-400/10 rounded-[2rem] flex items-center justify-center text-4xl shadow-inner">
          🏘️
        </div>
        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg animate-bounce">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </div>
      </div>

      <div className="max-w-md space-y-3">
        <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
          Your space is ready to be filled.
        </h3>
        <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
          Deezcord is better with others. Join an existing community to see what's happening or create a private room for your team.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-sm">
        <button
          onClick={onDiscover}
          className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Discover
        </button>
        <button
          onClick={onCreateRoom}
          className="w-full py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create Room
        </button>
      </div>
    </div>
  );
}
