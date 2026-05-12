import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from '../components/Logo';
import { useTheme } from '../hooks/useTheme';

export default function VerifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [countdown, setCountdown] = useState(3);
  const { isDarkMode, toggleTheme, mounted } = useTheme();

  // Derive success status from URL instead of using state to avoid cascading renders
  const isSuccess = useMemo(() => {
    return !(location.hash.includes('error') || location.search.includes('error'));
  }, [location]);

  useEffect(() => {
    let timer: number;
    if (countdown > 0) {
      timer = window.setTimeout(() => setCountdown(countdown - 1), 1000);
    } else {
      navigate('/login');
    }
    return () => clearTimeout(timer);
  }, [countdown, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-950 relative overflow-hidden font-sans text-slate-900 dark:text-slate-50">
      
      {/* Background Blobs */}
      <div className="absolute top-[10%] left-[20%] w-[400px] h-[400px] bg-blue-500/30 dark:bg-blue-500/15 rounded-full blur-[80px] z-0 animate-pulse"></div>
      <div className="absolute bottom-[10%] right-[20%] w-[350px] h-[350px] bg-emerald-500/30 dark:bg-emerald-400/15 rounded-full blur-[80px] z-0 animate-pulse" style={{ animationDelay: '2s' }}></div>

      {mounted && (
        <button 
          onClick={toggleTheme} 
          className="absolute top-6 right-6 bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border border-white/50 dark:border-white/10 text-slate-900 dark:text-slate-50 w-12 h-12 rounded-full flex items-center justify-center cursor-pointer z-50 transition-all duration-300 shadow-sm hover:scale-110 hover:shadow-md"
        >
          {isDarkMode ? (
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 17C14.7614 17 17 14.7614 17 12C17 9.23858 14.7614 7 12 7C9.23858 7 7 9.23858 7 12C7 14.7614 9.23858 17 12 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 1V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 21V23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4.22 4.22L5.64 5.64" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18.36 18.36L19.78 19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M1 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12H23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4.22 19.78L5.64 18.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18.36 5.64L19.78 4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      )}

      <div className="relative z-10 w-full max-w-[420px] bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-3xl p-10 md:p-12 shadow-2xl animate-fade-in-up text-center">
        <div className="flex justify-center mb-8">
          <Logo className="w-16 h-16" />
        </div>

        {isSuccess ? (
          <>
            <div className="w-20 h-20 bg-emerald-500/10 dark:bg-emerald-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10 text-emerald-500 dark:text-emerald-400" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="text-3xl font-extrabold mb-4 tracking-tight text-slate-900 dark:text-slate-50">Email Verified!</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
              Your account is now active. Welcome to the Deezcord community!
            </p>
            <div className="space-y-4">
              <button 
                onClick={() => navigate('/login')}
                className="w-full p-4 bg-blue-500 hover:bg-blue-600 dark:hover:bg-blue-400 text-white border-none rounded-xl text-base font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-[2px] hover:shadow-lg"
              >
                Continue to Login
              </button>
              <p className="text-slate-400 dark:text-slate-500 text-xs font-medium">
                Redirecting you in {countdown}s...
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-red-500/10 dark:bg-red-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10 text-red-500 dark:text-red-400" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h1 className="text-3xl font-extrabold mb-4 tracking-tight text-slate-900 dark:text-slate-50">Verification Failed</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
              The verification link may have expired or is invalid. Please try registering again or contact support.
            </p>
            <button 
              onClick={() => navigate('/login')}
              className="w-full p-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-50 border-none rounded-xl text-base font-semibold cursor-pointer transition-all duration-200"
            >
              Return to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
