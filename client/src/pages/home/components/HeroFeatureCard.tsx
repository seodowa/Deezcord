interface HeroFeatureCardProps {
  isNewUser: boolean;
  onExplore: () => void;
}

export default function HeroFeatureCard({ isNewUser, onExplore }: HeroFeatureCardProps) {
  return (
    <div className="relative group overflow-hidden rounded-[3rem] bg-gradient-to-br from-indigo-600 to-blue-700 p-1 shadow-2xl shadow-blue-500/20">
      <div className="absolute inset-0 bg-[url('/Logo.png')] bg-no-repeat bg-right-bottom bg-contain opacity-10 grayscale group-hover:scale-110 transition-transform duration-700"></div>
      <div className="relative bg-white/5 backdrop-blur-3xl rounded-[2.9rem] p-8 md:p-12 flex flex-col md:flex-row items-center gap-10">
        <div className="w-32 h-32 md:w-48 md:h-48 rounded-[2.5rem] bg-white/10 backdrop-blur-2xl border border-white/20 flex items-center justify-center shadow-2xl relative group-hover:rotate-3 transition-transform duration-500 shrink-0">
          <img src="/Logo.png" alt="Logo" className="w-20 h-20 md:w-32 md:h-32 object-contain drop-shadow-2xl" />
          <div className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-emerald-400 flex items-center justify-center shadow-lg animate-bounce duration-[3s]">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
               <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <div className="flex-1 text-center md:text-left space-y-6">
          <div className="space-y-2">
            <h3 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
              {isNewUser ? "Your journey starts here." : "Connect with your communities instantly."}
            </h3>
            <p className="text-indigo-100/80 text-lg font-medium max-w-xl">
              Deezcord is your unified hub for real-time collaboration. Create, join, and chat with friends in a beautiful, glass-inspired interface.
            </p>
          </div>
          <div className="flex flex-wrap justify-center md:justify-start gap-4">
            <button 
              onClick={onExplore}
              className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-bold text-lg shadow-xl shadow-white/10 hover:scale-105 active:scale-95 transition-all duration-300"
            >
              {isNewUser ? "Start Exploring" : "Explore Rooms"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
