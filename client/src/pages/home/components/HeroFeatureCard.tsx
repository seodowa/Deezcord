import Logo from '../../../components/Logo';

interface HeroFeatureCardProps {
  isNewUser: boolean;
  onExplore: () => void;
  className?: string;
}

export default function HeroFeatureCard({ isNewUser, onExplore, className = '' }: HeroFeatureCardProps) {
  return (
    <div className={`relative group overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-600 to-blue-700 dark:from-slate-900 dark:to-indigo-950 p-1 shadow-2xl shadow-blue-500/20 dark:shadow-indigo-950/40 border border-transparent dark:border-white/5 ${className}`}>
      <div className="absolute inset-0 bg-[url('/Logo.png')] bg-no-repeat bg-right-bottom bg-contain opacity-10 grayscale group-hover:scale-110 transition-transform duration-700"></div>
      <div className="relative bg-white/5 dark:bg-black/20 backdrop-blur-3xl rounded-[2.4rem] p-6 md:p-8 flex flex-col md:flex-row items-center gap-8">
        <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2rem] bg-white/10 dark:bg-white/5 backdrop-blur-2xl border border-white/20 dark:border-white/10 flex items-center justify-center shadow-2xl relative group-hover:rotate-3 transition-transform duration-500 shrink-0">
          <Logo className="w-16 h-16 md:w-20 md:h-20 drop-shadow-2xl" alt="Logo" />
          <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-emerald-400 flex items-center justify-center shadow-lg animate-bounce duration-[3s]">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
               <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <div className="flex-1 text-center md:text-left space-y-4">
          <div className="space-y-1">
            <h3 className="text-xl md:text-2xl font-extrabold text-white tracking-tight leading-tight">
              {isNewUser ? "Your journey starts here." : "Connect with your communities instantly."}
            </h3>
            <p className="text-indigo-100/80 dark:text-slate-400 text-sm font-medium max-w-xl">
              Deezcord is your unified hub for real-time collaboration. Create, join, and chat with friends in a beautiful interface.
            </p>
          </div>
          <div className="flex justify-center md:justify-start">
            <button 
              onClick={onExplore}
              className="px-6 py-3 bg-white text-indigo-600 dark:bg-indigo-500 dark:text-white rounded-xl font-bold text-sm shadow-xl shadow-white/10 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
            >
              {isNewUser ? "Start Exploring" : "Explore Rooms"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
