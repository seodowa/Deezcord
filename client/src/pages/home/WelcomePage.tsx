export default function WelcomePage() {
  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8">
      <div className="min-h-full flex items-center justify-center">
        <div className="max-w-2xl w-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-3xl p-8 md:p-12 text-center shadow-2xl animate-fade-in-up">
          <div className="flex justify-center mb-8 md:mb-10">
            <div className="p-1 rounded-[2.5rem] bg-indigo-500/10 ring-1 ring-indigo-500/20 shadow-xl">
              <img src="/Logo.png" alt="Deezcord Logo" className="w-24 h-24 md:w-32 md:h-32 object-contain rounded-3xl" />
            </div>
          </div>
          <h2 className="text-2xl md:text-4xl font-extrabold mb-4 tracking-tight text-slate-900 dark:text-slate-50">
            Welcome to Deezcord
          </h2>
          <p className="text-sm md:text-lg text-slate-500 dark:text-slate-400 mb-8 md:mb-10 leading-relaxed">
            You've successfully joined the community! Select a room from the sidebar to start chatting or create a new one to invite your friends.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="p-5 md:p-6 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-white/5 text-left shadow-sm transition-transform hover:-translate-y-1 duration-300">
              <div className="w-10 h-10 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-500 mb-4 text-xl">⚡</div>
              <h3 className="font-bold mb-2 text-slate-900 dark:text-slate-50">Real-time Chat</h3>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Powered by WebSockets for instant, low-latency messaging across all active rooms.</p>
            </div>
            <div className="p-5 md:p-6 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-white/5 text-left shadow-sm transition-transform hover:-translate-y-1 duration-300">
              <div className="w-10 h-10 bg-purple-500/10 dark:bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-500 mb-4 text-xl">🔒</div>
              <h3 className="font-bold mb-2 text-slate-900 dark:text-slate-50">Safe & Secure</h3>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Protected by Supabase Authentication ensuring your data and identity remain private.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
