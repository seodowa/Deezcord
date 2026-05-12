interface ProfileSetupCardProps {
  onSetupProfile: () => void;
}

export default function ProfileSetupCard({ onSetupProfile }: ProfileSetupCardProps) {
  return (
    <div className="p-6 md:p-8 rounded-[2.5rem] bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800 text-slate-900 dark:text-white relative overflow-hidden group shadow-2xl shadow-slate-200 dark:shadow-slate-900/20 border border-slate-200 dark:border-white/5 flex flex-col justify-center transition-all duration-300 hover:-translate-y-1">
      {/* Decorative Gradient Blob */}
      <div className="absolute -top-10 -right-10 w-48 h-48 bg-fuchsia-500/5 dark:bg-fuchsia-500/10 rounded-full blur-3xl group-hover:bg-fuchsia-500/10 dark:group-hover:bg-fuchsia-500/20 transition-colors"></div>
      
      <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
        {/* Stylized Avatar Placeholder */}
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-gradient-to-tr from-fuchsia-500/20 to-violet-500/20 dark:from-fuchsia-400/10 dark:to-violet-400/10 backdrop-blur-xl border border-fuchsia-500/20 dark:border-fuchsia-400/20 flex items-center justify-center relative shadow-lg group-hover:scale-105 transition-transform duration-500 shrink-0">
          <svg className="w-8 h-8 text-fuchsia-600 dark:text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-4 border-white dark:border-slate-900 shadow-sm animate-pulse"></div>
        </div>

        <div className="flex-1 text-center md:text-left space-y-3">
          <div className="space-y-1">
            <h4 className="text-xl md:text-2xl font-extrabold tracking-tight">Make it yours</h4>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium max-w-xs mx-auto md:mx-0">
              Personalize your Deezcord experience. Add an avatar and let your friends know you've arrived.
            </p>
          </div>
          <button 
            onClick={onSetupProfile}
            className="w-full py-3 bg-fuchsia-600 text-white dark:bg-fuchsia-500 rounded-xl font-bold text-sm hover:bg-fuchsia-700 dark:hover:bg-fuchsia-600 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-fuchsia-500/20 dark:shadow-fuchsia-950/40 cursor-pointer"
          >
            Set up profile
          </button>
        </div>
      </div>
    </div>
  );
}
