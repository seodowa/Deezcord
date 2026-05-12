import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';

interface VerificationModalProps {
  isOpen: boolean;
  email: string;
  onClose: () => void;
}

/**
 * VerificationModal
 * 
 * Uses the standard Modal component to ensure design consistency.
 * Informs the user to check their email for a verification link.
 * Includes a countdown that automatically redirects to the login page.
 */
export default function VerificationModal({ isOpen, email, onClose }: VerificationModalProps) {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    let timer: number;
    if (isOpen && countdown > 0) {
      timer = window.setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (isOpen && countdown === 0) {
      navigate('/login');
    }
    return () => clearTimeout(timer);
  }, [isOpen, countdown, navigate]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Check your inbox"
      description="Account activation required"
      maxWidth="max-w-md"
      footer={
        <div className="w-full space-y-4">
          <button 
            onClick={() => navigate('/login')}
            className="w-full p-4 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 text-white border-none rounded-2xl text-base font-bold cursor-pointer transition-all duration-200 shadow-lg hover:shadow-blue-500/25 active:scale-95"
          >
            Go to Login
          </button>
          
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-widest">
            <div className="w-1 h-1 bg-slate-400 rounded-full animate-pulse"></div>
            Redirecting in {countdown}s
            <div className="w-1 h-1 bg-slate-400 rounded-full animate-pulse"></div>
          </div>
        </div>
      }
    >
      <div className="text-center">
        {/* Envelope Icon */}
        <div className="w-20 h-20 bg-blue-500/10 dark:bg-blue-400/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10 text-blue-500 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 6L12 13L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
          We've sent a verification link to <br/>
          <span className="font-bold text-blue-600 dark:text-blue-400">{email}</span>. <br/>
          Please click the link to activate your account.
        </p>
      </div>
    </Modal>
  );
}
