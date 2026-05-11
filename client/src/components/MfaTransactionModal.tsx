import { useState } from 'react';
import Modal from './Modal';
import AsyncButton from './AsyncButton';

interface MfaTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (code: string) => Promise<void>;
  title?: string;
  description?: string;
  actionLabel?: string;
}

/**
 * MfaTransactionModal
 * 
 * Used for Code-per-action (Transactional MFA).
 * It collects a 6-digit code and passes it to the onConfirm callback.
 * It DOES NOT verify the code itself; the verification happens on the backend 
 * during the specific destructive action.
 */
export default function MfaTransactionModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  title = "Security Challenge",
  description = "Please enter your 6-digit MFA code to authorize this action.",
  actionLabel = "Authorize Action"
}: MfaTransactionModalProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (code.length !== 6) {
      setError("Please enter a 6-digit code.");
      return;
    }

    try {
      setError(null);
      await onConfirm(code);
      // If the above succeeds, the parent will likely close this modal or redirect
      setCode('');
    } catch (err: any) {
      // If the parent request fails due to an invalid code, we show it here
      if (err.message.includes("INVALID_MFA_CODE") || err.message.includes("incorrect")) {
        setError("Invalid code. Please try again.");
      } else {
        setError(err.message || "Something went wrong.");
      }
      // We don't re-throw here because AsyncButton handles the loading state
    }
  };

  const handleClose = () => {
    setCode('');
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      description={description}
      maxWidth="max-w-md"
    >
      <div className="space-y-6">
        <div className="text-center">
          {/* Lock Icon */}
          <div className="w-20 h-20 bg-blue-500/10 dark:bg-blue-400/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10 text-blue-500 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 15V17M6 10V8C6 4.68629 8.68629 2 12 2C15.3137 2 18 4.68629 18 8V10M6 10H18M6 10C4.89543 10 4 10.8954 4 12V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V12C20 10.8954 19.1046 10 18 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
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
            className="w-full p-4 text-center text-3xl tracking-[0.5em] font-mono bg-white/50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-white/10 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
          />
          {error && (
            <p className="mt-2 text-red-500 text-xs font-bold text-center animate-shake">
              {error}
            </p>
          )}
        </div>

        <AsyncButton
          onClick={handleConfirm}
          loadingText="Authorizing..."
          className="w-full p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold transition-all shadow-lg hover:shadow-blue-500/25"
        >
          {actionLabel}
        </AsyncButton>

        <button
          onClick={handleClose}
          className="w-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-sm font-bold transition-colors"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
