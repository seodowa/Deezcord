import { useState } from 'react';
import Modal from './Modal';
import AsyncButton from './AsyncButton';
import { mfaVerify } from '../services/authService';
import { useToast } from '../hooks/useToast';
import { getToken, setToken } from '../utils/auth';

interface MFAChallengeModalProps {
  isOpen: boolean;
  factorId: string;
  token?: string; // Optional token for verification (e.g. during login)
  onClose: () => void;
  onSuccess: (newToken: string) => void;
}

/**
 * MFAChallengeModal
 * 
 * Displayed when an action requires AAL2 (MFA).
 * Prompts for the 6-digit TOTP code and upgrades the session.
 */
export default function MFAChallengeModal({ isOpen, factorId, token, onClose, onSuccess }: MFAChallengeModalProps) {
  const { addToast } = useToast();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError("Please enter a 6-digit code.");
      return;
    }

    try {
      setError(null);
      const activeToken = token || getToken();
      if (!activeToken) throw new Error("Session expired. Please log in again.");

      const data = await mfaVerify(activeToken, factorId, code);
      
      // If we're not using an override token, it means we're upgrading an existing session
      // So we update the local storage token.
      if (!token) {
        setToken(data.access_token, true);
      }
      
      addToast("Identity verified!", "success");
      onSuccess(data.access_token);
    } catch (err: any) {
      setError(err.message || "Invalid code. Please try again.");
      throw err; 
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Security Verification"
      description="This action requires secondary authentication."
      maxWidth="max-w-md"
    >
      <div className="space-y-6">
        <div className="text-center">
          {/* Shield Icon */}
          <div className="w-20 h-20 bg-blue-500/10 dark:bg-blue-400/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10 text-blue-500 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            Enter the code from your authenticator app to continue.
          </p>
        </div>

        <div className="relative">
          <input
            type="text"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            autoFocus
            className="w-full p-4 text-center text-3xl tracking-[0.5em] font-mono bg-white/50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-white/10 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
          />
          {error && (
            <p className="mt-2 text-red-500 text-xs font-bold text-center animate-shake">
              {error}
            </p>
          )}
        </div>

        <AsyncButton
          onClick={handleVerify}
          loadingText="Verifying..."
          className="w-full p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold transition-all shadow-lg hover:shadow-blue-500/25"
        >
          Verify
        </AsyncButton>

        <button
          onClick={onClose}
          className="w-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-sm font-bold transition-colors"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
