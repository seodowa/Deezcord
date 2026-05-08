interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = "Loading Deezcord..." }: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      {/* Aesthetic Blobs */}
      <div className="absolute top-[10%] left-[20%] w-[400px] h-[400px] bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-[80px] z-0 animate-pulse"></div>
      <div className="absolute bottom-[10%] right-[20%] w-[350px] h-[350px] bg-purple-500/20 dark:bg-purple-500/10 rounded-full blur-[80px] z-0 animate-pulse" style={{ animationDelay: '2s' }}></div>
      
      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-white dark:bg-slate-800 shadow-2xl flex items-center justify-center relative overflow-hidden group">
            <img src="/Logo.png" alt="Deezcord" className="w-16 h-16 object-contain animate-bounce duration-[2s]" />
          </div>
          <div className="absolute -inset-4 border-4 border-blue-500/30 border-t-blue-500 rounded-[2.5rem] animate-spin"></div>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
            Deezcord
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
