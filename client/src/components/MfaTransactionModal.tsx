import { useState, useEffect, useCallback } from 'react';
import Modal from './Modal';
import AsyncButton from './AsyncButton';
import { useAuth } from '../hooks/useAuth';
import { mfaRequestEmail } from '../services/authService';
import { useToast } from '../hooks/useToast';

interface MfaTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (code: string) => Promise<void>;
  title?: string;
  description?: string;
  actionLabel?: string;
}

export default function MfaTransactionModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  title = "Security Challenge",
  description,
  actionLabel = "Authorize Action"
}: MfaTransactionModalProps) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const mfaPreference = user?.app_metadata?.mfa_preference || 'none';
  // Fallback: Treat 'none' as 'email' for transactional challenges
  const effectiveMfa = mfaPreference === 'none' ? 'email' : mfaPreference;

  const handleResendEmail = useCallback(async () => {
    if (resendCooldown > 0) return;
    setIsSendingEmail(true);
    try {
      await mfaRequestEmail('transactional');
      addToast("A security code has been sent to your email.", "info");
      setResendCooldown(60);
    } catch (err: any) {
      setError("Failed to send email code. Please try again.");
    } finally {
      setIsSendingEmail(false);
    }
  }, [resendCooldown, addToast]);

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

  // Automatically request email code if effective method is email
  useEffect(() => {
    if (isOpen && effectiveMfa === 'email') {
      handleResendEmail();
    }
  }, [isOpen, effectiveMfa, handleResendEmail]);

  const handleConfirm = async () => {
    if (code.length !== 6) {
      setError("Please enter a 6-digit code.");
      return;
    }

    try {
      setError(null);
      await onConfirm(code);
      setCode('');
    } catch (err: any) {
      if (err.message.includes("INVALID_MFA_CODE") || err.message.includes("incorrect") || err.message.includes("Invalid security code")) {
        setError(err.message || "Invalid code. Please try again.");
      } else {
        setError(err.message || "Something went wrong.");
      }
    }
  };

  const defaultDescription = effectiveMfa === 'email' 
    ? "Please enter the 6-digit code we sent to your email." 
    : "Please enter your 6-digit MFA code from your authenticator app.";

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      description={description || defaultDescription}
      maxWidth="max-w-md"
    >
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-blue-500/10 dark:bg-blue-400/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            {effectiveMfa === 'email' ? (
              <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10 text-blue-500 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 8L10.8906 13.2604C11.5624 13.7083 12.4376 13.7083 13.1094 13.2604L21 8M5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10 text-blue-500 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 15V17M6 10V8C6 4.68629 8.68629 2 12 2C15.3137 2 18 4.68629 18 8V10M6 10H18M6 10C4.89543 10 4 10.8954 4 12V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V12C20 10.8954 19.1046 10 18 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        </div>

        <div className="relative">
          <input
            type="text"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            autoFocus
            disabled={isSendingEmail}
            className="w-full p-4 text-center text-3xl tracking-[0.5em] font-mono bg-white/50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-white/10 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none disabled:opacity-50"
          />
          {isSendingEmail && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/20 dark:bg-black/20 rounded-2xl">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}
          {error && (
            <p className="mt-2 text-red-500 text-xs font-bold text-center animate-shake">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <AsyncButton
            onClick={handleConfirm}
            loadingText="Authorizing..."
            disabled={isSendingEmail}
            className="w-full p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold transition-all shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 cursor-pointer"
          >
            {actionLabel}
          </AsyncButton>

          {effectiveMfa === 'email' && (
            <button
              onClick={handleResendEmail}
              disabled={resendCooldown > 0 || isSendingEmail}
              className="w-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
