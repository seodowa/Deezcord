export default function MessageSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in w-full h-full p-4 md:p-6 overflow-hidden">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className={`flex gap-3 relative ${i % 2 === 0 ? 'flex-row-reverse' : 'flex-row'}`}>
          <div className="flex-shrink-0 mt-1">
            <div className="w-9 h-9 rounded-xl bg-slate-200/50 dark:bg-slate-700/50 animate-pulse backdrop-blur-sm border border-slate-200/50 dark:border-white/10"></div>
          </div>
          <div className={`flex flex-col ${i % 2 === 0 ? 'items-end' : 'items-start'} max-w-[80%]`}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-24 h-3 bg-slate-200/50 dark:bg-slate-700/50 rounded animate-pulse"></div>
              <div className="w-12 h-2 bg-slate-200/50 dark:bg-slate-700/50 rounded animate-pulse"></div>
            </div>
            <div className={`px-4 py-2 rounded-2xl shadow-sm ${
                i % 2 === 0 
                  ? 'bg-blue-500/20 dark:bg-blue-500/10 rounded-tr-none' 
                  : 'bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/10 rounded-tl-none'
              }`}>
              <div className={`h-4 bg-slate-200/50 dark:bg-slate-700/50 rounded animate-pulse ${i === 3 ? 'w-48' : i === 1 ? 'w-64' : 'w-32'} mb-2`}></div>
              {i % 2 !== 0 && <div className={`h-4 bg-slate-200/50 dark:bg-slate-700/50 rounded animate-pulse w-40`}></div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
