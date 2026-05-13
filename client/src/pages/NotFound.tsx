import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

export default function NotFoundPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-950 relative overflow-hidden font-sans text-slate-900 dark:text-slate-50 transition-colors duration-500">
      
      {/* Background Blobs for Visual Aesthetics */}
      <div className="absolute top-[10%] left-[20%] w-[400px] h-[400px] bg-red-500/20 dark:bg-red-500/10 rounded-full blur-[80px] z-0 animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-[10%] right-[20%] w-[350px] h-[350px] bg-orange-500/20 dark:bg-orange-500/10 rounded-full blur-[80px] z-0 animate-pulse pointer-events-none" style={{ animationDelay: '2s' }}></div>

      <div className="relative z-10 w-full max-w-[420px] bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-3xl p-10 md:p-12 text-center shadow-2xl animate-fade-in-up">
        
        <div className="flex justify-center mb-8">
          <Logo className="w-24 h-24 opacity-50 grayscale contrast-125" />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-extrabold mb-2 tracking-tight text-slate-900 dark:text-slate-50">
          404
        </h1>
        
        <h2 className="text-xl font-bold mb-4 text-slate-700 dark:text-slate-200">
          Page Not Found
        </h2>
        
        <p className="text-base text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
          Oops! It looks like you've wandered into a room that doesn't exist. 
        </p>

        <button 
          onClick={() => navigate('/')}
          className="w-full p-4 bg-blue-500 hover:bg-blue-600 dark:hover:bg-blue-400 text-white border-none rounded-xl text-base font-semibold cursor-pointer transition-all duration-200 relative overflow-hidden hover:-translate-y-[2px] hover:shadow-[0_10px_20px_-10px_rgba(59,130,246,1)] active:translate-y-0"
        >
          Return Home
        </button>

      </div>
    </div>
  );
}
