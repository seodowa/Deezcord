import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { registerUser } from '../services/authService';
import Logo from '../components/Logo';
import VerificationModal from '../components/VerificationModal';
import AsyncButton from '../components/AsyncButton';
import { useTheme } from '../hooks/useTheme';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  const { isDarkMode, toggleTheme, mounted } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    const isValidEmail = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/g;

    e.preventDefault();
    setError(null);

    if (!isValidEmail.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    setIsLoading(true);
    
    try {
      await registerUser(username, email, password);
      // Show verification modal instead of immediate redirect
      setShowVerificationModal(true);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'An error occurred during registration.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-950 relative overflow-hidden font-sans text-slate-900 dark:text-slate-50">
      
      {/* Verification Modal Component */}
      <VerificationModal 
        isOpen={showVerificationModal} 
        email={email} 
        onClose={() => setShowVerificationModal(false)} 
      />

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

      <div className="relative z-10 w-full max-w-[420px] bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-white/10 rounded-3xl p-10 md:p-12 shadow-2xl animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Logo className="w-16 h-16" />
          </div>
          <h1 className="text-3xl font-extrabold mb-2 tracking-tight text-slate-900 dark:text-slate-50">Create Account</h1>
          <p className="text-[0.95rem] text-slate-500 dark:text-slate-400 m-0">Join the Deezcord community today</p>
        </div>

        {/* Error message display */}
        {error && (
          <div className="mb-6 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2 text-slate-900 dark:text-slate-50" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              className="w-full px-4 py-3 bg-white/90 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-xl text-base text-slate-900 dark:text-slate-50 transition-all duration-200 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 placeholder:text-slate-500/70 dark:placeholder:text-slate-400/70"
              placeholder="johndoe"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2 text-slate-900 dark:text-slate-50" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="w-full px-4 py-3 bg-white/90 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-xl text-base text-slate-900 dark:text-slate-50 transition-all duration-200 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 placeholder:text-slate-500/70 dark:placeholder:text-slate-400/70"
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2 text-slate-900 dark:text-slate-50" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="w-full px-4 py-3 bg-white/90 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-xl text-base text-slate-900 dark:text-slate-50 transition-all duration-200 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 placeholder:text-slate-500/70 dark:placeholder:text-slate-400/70"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="mb-8">
            <label className="block text-sm font-semibold mb-2 text-slate-900 dark:text-slate-50" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="w-full px-4 py-3 bg-white/90 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-xl text-base text-slate-900 dark:text-slate-50 transition-all duration-200 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 placeholder:text-slate-500/70 dark:placeholder:text-slate-400/70"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <AsyncButton 
            type="submit" 
            className="w-full p-4 bg-blue-500 hover:bg-blue-600 dark:hover:bg-blue-400 text-white border-none rounded-xl text-base font-semibold cursor-pointer transition-all duration-200 relative overflow-hidden hover:-translate-y-[2px] hover:shadow-[0_10px_20px_-10px_rgba(59,130,246,1)] active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed"
            isLoading={isLoading}
            loadingText="Creating account..."
          >
            Create Account
          </AsyncButton>
        </form>

        <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account? 
          <Link to="/login" className="text-blue-500 dark:text-blue-400 font-semibold ml-1 transition-colors duration-200 hover:text-blue-700 dark:hover:text-blue-300 hover:underline cursor-pointer">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}