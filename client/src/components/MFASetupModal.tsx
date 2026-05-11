import { useState, useEffect, useCallback } from 'react';
import Modal from './Modal';
import AsyncButton from './AsyncButton';
import { mfaEnroll, mfaVerify } from '../services/authService';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { getToken, setToken } from '../utils/auth';

interface MFASetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function MFASetupModal({ isOpen, onClose, onSuccess }: MFASetupModalProps) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [step, setStep] = useState<'qr' | 'verify' | 'success'>('qr');
  const [enrollData, setEnrollData] = useState<{ id: string; totp: { qr_code: string; secret: string; uri: string } } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && !enrollData && step === 'qr') {
      handleEnroll();
    }
  }, [isOpen, enrollData, step]);

  const handleEnroll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) throw new Error("Not authenticated");
      const data = await mfaEnroll(token);
      setEnrollData(data);
    } catch (err: any) {
      console.error("MFA Enroll Error:", err);
      setError(err.message || "Failed to start MFA setup. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleVerify = useCallback(async () => {
    if (code.length !== 6) {
      setError("Please enter a 6-digit code.");
      return;
    }

    try {
      setError(null);
      const token = getToken();
      if (!token || !enrollData) throw new Error("Invalid session");

      const data = await mfaVerify(token, enrollData.id, code);
      
      // Update the local token with the new AAL2 token
      setToken(data.access_token, true); 
      
      setStep('success');
      addToast("Multi-factor authentication enabled successfully!", "success");
      
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "Invalid code. Please try again.");
    }
  }, [code, enrollData, addToast, onSuccess]);

  const resetAndClose = useCallback(() => {
    setStep('qr');
    setEnrollData(null);
    setCode('');
    setError(null);
    setIsLoading(false);
    onClose();
  }, [onClose]);

  if (isOpen && isLoading && !enrollData && !error) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetAndClose}
      title={step === 'success' ? "MFA Enabled" : "Secure Your Account"}
      description={step === 'success' ? "Your account is now more secure." : "Set up two-factor authentication (TOTP)."}
      maxWidth="max-w-md"
    >
      <div className="space-y-6">
        {step === 'qr' && enrollData && (
          <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-4 bg-white rounded-3xl shadow-xl mb-6 border border-slate-100 flex items-center justify-center">
              <img 
                src={enrollData.totp.qr_code.startsWith('data:') 
                  ? enrollData.totp.qr_code 
                  : `data:image/svg+xml;base64,${btoa(enrollData.totp.qr_code)}`
                } 
                alt="MFA QR Code"
                className="w-48 h-48 block"
              />
            </div>
            
            <div className="text-center space-y-4">
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                Scan this QR code with your authenticator app (like Google Authenticator or Authy).
              </p>
              
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-white/10 select-all font-mono text-xs text-slate-600 dark:text-slate-400">
                Secret: {enrollData.totp.secret}
              </div>

              <button
                onClick={() => setStep('verify')}
                className="w-full p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold transition-all hover:shadow-lg hover:shadow-blue-500/25"
              >
                I've scanned it
              </button>
            </div>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center">
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Enter the 6-digit verification code from your app.
              </p>
            </div>

            <div className="relative">
              <input
                type="text"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
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
              className="w-full p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold transition-all shadow-lg hover:shadow-blue-500/25"
            >
              Verify & Enable
            </AsyncButton>

            <button
              onClick={() => setStep('qr')}
              className="w-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-sm font-bold transition-colors"
            >
              Back to QR Code
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center space-y-6 animate-in zoom-in duration-500">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10 text-emerald-500" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Multi-factor authentication is now active on your account. You will be prompted for a code when performing sensitive actions.
            </p>

            <button
              onClick={resetAndClose}
              className="w-full p-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-xl"
            >
              Done
            </button>
          </div>
        )}

        {error && step === 'qr' && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm font-medium text-center">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
