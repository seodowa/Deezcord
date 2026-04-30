import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AsyncButton from '../components/AsyncButton';
import { useToast } from '../hooks/useToast';
import { loginUser } from '../services/authService';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  const { login } = useAuth();

  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
    // On mount, read from local storage or system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setTimeout(() => setIsDarkMode(true), 0);
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      setTimeout(() => setIsDarkMode(false), 0);
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const data = await loginUser(identifier, password);
      addToast('Successfully signed in!', 'success');
      
      login(data.token, rememberMe);
      
      navigate('/home');
    } catch (error: unknown) {
      const err = error as Error;
      addToast(err.message || 'Login failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-950 relative overflow-hidden font-sans text-slate-900 dark:text-slate-50 transition-colors duration-500">
      
      {/* Deezcord Server Status Feature - Top Left */}
      <div className="absolute top-6 left-6 bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/50 dark:border-white/10 text-slate-900 dark:text-slate-50 px-4 py-2 rounded-full flex items-center gap-2.5 z-50 shadow-sm transition-colors duration-500">
        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
        <span className="text-sm font-medium">All Systems Operational</span>
      </div>

      {mounted && (
        <button 
          onClick={toggleTheme} 
          className="absolute top-6 right-6 bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border border-white/50 dark:border-white/10 text-slate-900 dark:text-slate-50 w-12 h-12 rounded-full flex items-center justify-center cursor-pointer z-50 transition-all duration-300 shadow-sm hover:scale-110 hover:shadow-md"
          aria-label="Toggle Dark Mode"
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

      {/* Background Blobs for Visual Aesthetics */}
      <div className="absolute top-[10%] left-[20%] w-[400px] h-[400px] bg-blue-500/30 dark:bg-blue-500/15 rounded-full blur-[80px] z-0 animate-pulse"></div>
      <div className="absolute bottom-[10%] right-[20%] w-[350px] h-[350px] bg-purple-500/30 dark:bg-purple-500/15 rounded-full blur-[80px] z-0 animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="relative z-10 w-full mx-5 max-w-[25rem] min-w-[20rem] bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-white/10 rounded-3xl p-10 md:p-12 shadow-2xl animate-fade-in-up">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold mb-2 tracking-tight text-slate-900 dark:text-slate-50">Welcome Back</h1>
          <p className="text-[0.95rem] text-slate-500 dark:text-slate-400 m-0">Enter your details to access your account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2 text-slate-900 dark:text-slate-50" htmlFor="identifier">
              Username or Email
            </label>
            <div className="relative">
              <input
                id="identifier"
                type="text"
                className="w-full px-4 py-3.5 bg-white/90 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-xl text-base text-slate-900 dark:text-slate-50 transition-all duration-200 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 focus:-translate-y-[1px] placeholder:text-slate-500/70 dark:placeholder:text-slate-400/70"
                placeholder="user@example.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2 text-slate-900 dark:text-slate-50" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type="password"
                className="w-full px-4 py-3.5 bg-white/90 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-xl text-base text-slate-900 dark:text-slate-50 transition-all duration-200 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 focus:-translate-y-[1px] placeholder:text-slate-500/70 dark:placeholder:text-slate-400/70"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex justify-between items-center mb-8">
            <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                className="accent-blue-500 w-[18px] h-[18px] cursor-pointer"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember me
            </label>
            <Link to="/forgot-password" className="text-sm text-blue-500 dark:text-blue-400 font-semibold transition-colors duration-200 hover:text-blue-700 dark:hover:text-blue-300 hover:underline">
              Forgot password?
            </Link>
          </div>

          <AsyncButton 
            type="submit" 
            className="w-full p-4 bg-blue-500 hover:bg-blue-600 dark:hover:bg-blue-400 text-white border-none rounded-xl text-base font-semibold cursor-pointer transition-all duration-200 relative overflow-hidden hover:-translate-y-[2px] hover:shadow-[0_10px_20px_-10px_rgba(59,130,246,1)] active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed"
            isLoading={isLoading}
            loadingText="Signing in..."
          >
            Sign In
          </AsyncButton>
        </form>

        <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Don't have an account? 
          <Link to="/register" className="text-blue-500 dark:text-blue-400 font-semibold ml-1 transition-colors duration-200 hover:text-blue-700 dark:hover:text-blue-300 hover:underline">
            Sign up for free
          </Link>
        </div>
      </div>
    </div>
  );
}
