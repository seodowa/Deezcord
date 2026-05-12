import { useState, useCallback } from 'react';
import Modal from './Modal';
import AsyncButton from './AsyncButton';
import { mfaEnroll, mfaVerify, mfaRequestEmail, mfaSetupVerifyEmail } from '../services/authService';
import { useToast } from '../hooks/useToast';
import { getToken, setTokens, getRefreshToken } from '../utils/auth';

interface MFASetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function MFASetupModal({ isOpen, onClose, onSuccess }: MFASetupModalProps) {
  const { addToast } = useToast();
  const [step, setStep] = useState<'choice' | 'qr' | 'verify' | 'email-verify' | 'success'>('choice');
  const [enrollData, setEnrollData] = useState<{ id: string; totp: { qr_code: string; secret: string; uri: string } } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleEnrollTOTP = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) throw new Error("Not authenticated");
      const data = await mfaEnroll(token);
      setEnrollData(data);
      setStep('qr');
    } catch (err) {
      console.error("MFA Enroll Error:", err);
      setError(err instanceof Error ? err.message : "Failed to start MFA setup. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleEnrollEmail = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await mfaRequestEmail('setup');
      setStep('email-verify');
      addToast("A verification code has been sent to your email.", "info");
    } catch (err) {
      console.error("MFA Email Setup Error:", err);
      setError(err instanceof Error ? err.message : "Failed to send email code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  const handleVerifyTOTP = useCallback(async () => {
    if (code.length !== 6) {
      setError("Please enter a 6-digit code.");
      return;
    }

    try {
      setError(null);
      const token = getToken();
      if (!token || !enrollData) throw new Error("Invalid session");

      const data = await mfaVerify(token, enrollData.id, code);
      
      // Update the local tokens with the new AAL2 token
      const rememberMe = !!localStorage.getItem('sb-refresh-token');
      const refreshToken = data.refresh_token || getRefreshToken() || '';
      setTokens(data.access_token, refreshToken, rememberMe); 
      
      setStep('success');
      addToast("Multi-factor authentication enabled successfully!", "success");
      
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code. Please try again.");
    }
  }, [code, enrollData, addToast, onSuccess]);

  const handleVerifyEmail = useCallback(async () => {
    if (code.length !== 6) {
      setError("Please enter a 6-digit code.");
      return;
    }

    try {
      setError(null);
      await mfaSetupVerifyEmail(code);
      
      setStep('success');
      addToast("Email MFA enabled successfully!", "success");
      
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code. Please try again.");
    }
  }, [code, addToast, onSuccess]);

  const resetAndClose = useCallback(() => {
    setStep('choice');
    setEnrollData(null);
    setCode('');
    setError(null);
    setIsLoading(false);
    onClose();
  }, [onClose]);

  if (isOpen && isLoading && !enrollData && !error && step === 'qr') {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetAndClose}
      title={step === 'success' ? "MFA Enabled" : "Secure Your Account"}
      description={step === 'success' ? "Your account is now more secure." : "Choose how you want to verify your identity."}
      maxWidth="max-w-md"
    >
      <div className="space-y-6">
        {step === 'choice' && (
          <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button
              onClick={handleEnrollTOTP}
              className="flex items-center p-4 bg-white dark:bg-slate-900/50 border-2 border-slate-100 dark:border-white/5 rounded-2xl hover:border-blue-500 dark:hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-all group text-left cursor-pointer"
            >
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mr-4 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 18H12.01M7 21H17C18.1046 21 19 20.1046 19 19V5C19 3.89543 18.1046 3 17 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-slate-800 dark:text-white">Authenticator App</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Use Google Authenticator, Authy, or similar.</p>
              </div>
            </button>

            <button
              onClick={handleEnrollEmail}
              className="flex items-center p-4 bg-white dark:bg-slate-900/50 border-2 border-slate-100 dark:border-white/5 rounded-2xl hover:border-emerald-500 dark:hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition-all group text-left cursor-pointer"
            >
              <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mr-4 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 8L10.8906 13.2604C11.5624 13.7083 12.4376 13.7083 13.1094 13.2604L21 8M5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-slate-800 dark:text-white">Email Verification</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Receive a 6-digit code in your inbox.</p>
              </div>
            </button>
          </div>
        )}

        {step === 'qr' && enrollData && (
          <div className="flex flex-col items-center animate-in fade-in slide-in-from-right-4 duration-500">
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
                Scan this QR code with your authenticator app.
              </p>
              
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-white/10 select-all font-mono text-xs text-slate-600 dark:text-slate-400">
                Secret: {enrollData.totp.secret}
              </div>

              <button
                onClick={() => setStep('verify')}
                className="w-full p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold transition-all hover:shadow-lg hover:shadow-blue-500/25 cursor-pointer"
              >
                I've scanned it
              </button>
            </div>
          </div>
        )}

        {(step === 'verify' || step === 'email-verify') && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center">
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                {step === 'verify' 
                  ? "Enter the 6-digit verification code from your app." 
                  : "Enter the 6-digit code sent to your email."}
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
              onClick={step === 'verify' ? handleVerifyTOTP : handleVerifyEmail}
              className={`w-full p-4 ${step === 'verify' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-emerald-500 hover:bg-emerald-600'} text-white rounded-2xl font-bold transition-all shadow-lg hover:shadow-blue-500/25 cursor-pointer`}
            >
              Verify & Enable
            </AsyncButton>

            <button
              onClick={() => setStep('choice')}
              className="w-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-sm font-bold transition-colors cursor-pointer"
            >
              Change method
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
              Multi-factor authentication is now active on your account.
            </p>

            <button
              onClick={resetAndClose}
              className="w-full p-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-xl cursor-pointer"
            >
              Done
            </button>
          </div>
        )}

        {error && (step === 'choice' || step === 'qr') && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm font-medium text-center">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
