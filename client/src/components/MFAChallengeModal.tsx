import { useState, useEffect, useCallback } from 'react';
import Modal from './Modal';
import AsyncButton from './AsyncButton';
import { mfaVerify, mfaRequestEmail, mfaVerifyEmail } from '../services/authService';
import { useToast } from '../hooks/useToast';
import { getToken, setTokens, getRefreshToken } from '../utils/auth';

interface MFAChallengeModalProps {
  isOpen: boolean;
  factorId?: string;
  token?: string; // Optional token for verification (e.g. during login)
  mfaMethod?: 'totp' | 'email';
  onClose: () => void;
  onSuccess: (newToken: string, newRefreshToken: string) => void;
}

/**
 * MFAChallengeModal
 * 
 * Displayed when an action requires AAL2 (MFA).
 * Prompts for the 6-digit code (TOTP or Email) and upgrades the session.
 */
export default function MFAChallengeModal({ 
  isOpen, 
  factorId, 
  token, 
  mfaMethod = 'totp',
  onClose, 
  onSuccess 
}: MFAChallengeModalProps) {
  const { addToast } = useToast();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const isEmail = mfaMethod === 'email';

  const handleResendEmail = useCallback(async () => {
    if (resendCooldown > 0) return;
    try {
      const activeToken = token || getToken();
      if (!activeToken) throw new Error("Session expired. Please log in again.");

      await mfaRequestEmail('transactional', activeToken);
      addToast("Security code sent to your email", "info");
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || "Failed to send code");
    }
  }, [token, resendCooldown, addToast]);

  const handleClose = useCallback(() => {
    setCode('');
    setError(null);
    setResendCooldown(0);
    onClose();
  }, [onClose]);

  // Handle countdown for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Auto-request email code on mount if in email mode
  useEffect(() => {
    if (isOpen && isEmail) {
      handleResendEmail();
    }
  }, [isOpen, isEmail, handleResendEmail]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError("Please enter a 6-digit code.");
      return;
    }

    try {
      setError(null);
      const activeToken = token || getToken();
      if (!activeToken) throw new Error("Session expired. Please log in again.");

      let result;
      if (isEmail) {
        result = await mfaVerifyEmail(activeToken, code, 'transactional');
      } else {
        if (!factorId) throw new Error("Factor ID missing for TOTP verification");
        result = await mfaVerify(activeToken, factorId, code);
      }
      
      const newAccessToken = result.access_token || result.token || activeToken;
      const newRefreshToken = result.refresh_token || getRefreshToken() || '';

      // If we're not using an override token, it means we're upgrading an existing session
      // So we update the local storage tokens.
      if (!token) {
        const rememberMe = !!localStorage.getItem('sb-refresh-token');
        setTokens(newAccessToken, newRefreshToken, rememberMe);
      }
      
      addToast("Identity verified!", "success");
      onSuccess(newAccessToken, newRefreshToken);
    } catch (err: any) {
      setError(err.message || "Invalid code. Please try again.");
      throw err; 
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Security Verification"
      description={isEmail 
        ? "We've sent a 6-digit security code to your email address." 
        : "This action requires secondary authentication."}
      maxWidth="max-w-md"
    >
      <div className="space-y-6">
        <div className="text-center">
          {/* Icon */}
          <div className="w-20 h-20 bg-blue-500/10 dark:bg-blue-400/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            {isEmail ? (
              <svg className="w-10 h-10 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10 text-blue-500 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            {isEmail 
              ? "Check your email inbox for the verification code." 
              : "Enter the code from your authenticator app to continue."}
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

        <div className="flex flex-col gap-3">
          <AsyncButton
            onClick={handleVerify}
            loadingText="Verifying..."
            className="w-full p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold transition-all shadow-lg hover:shadow-blue-500/25 cursor-pointer"
          >
            Verify
          </AsyncButton>

          {isEmail && (
            <button
              onClick={handleResendEmail}
              disabled={resendCooldown > 0}
              className="text-sm font-medium text-slate-500 hover:text-blue-500 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors py-2 cursor-pointer"
            >
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't receive a code? Resend"}
            </button>
          )}

          <button
            onClick={handleClose}
            className="w-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-sm font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
