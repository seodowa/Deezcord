import { useState, useEffect } from 'react';
import { useToast } from '../hooks/useToast';
import { updatePassword, updateEmail, requestEmailChangeOtp } from '../services/userService';
import { verifyMfaCode } from '../services/authService';
import { useAuth } from '../hooks/useAuth';
import AsyncButton from './AsyncButton';
import MfaTransactionModal from './MfaTransactionModal';

interface SecuritySettingsProps {
  currentAAL: 'aal1' | 'aal2' | null;
  isMFAEnabled: boolean;
  mfaMethod: 'totp' | 'email' | 'none';
  isCheckingMFA: boolean;
  isDisablingMFA: boolean;
  onSetupMFA: () => void;
  onDisableMFA: () => void;
}

type EmailStage = 'locked' | 'input' | 'verify';

/**
 * SecuritySettings
 * 
 * Manages user security settings including MFA, email, and password updates.
 * Implements a streamlined 2-step verified email change process (Refined).
 */
export default function SecuritySettings({
  currentAAL,
  isMFAEnabled,
  mfaMethod,
  isCheckingMFA,
  isDisablingMFA,
  onSetupMFA,
  onDisableMFA
}: SecuritySettingsProps) {
  const { addToast } = useToast();
  const { user, setUser } = useAuth();
  
  // Email Change State machine (Phase 5)
  const [emailStage, setEmailStage] = useState<EmailStage>('locked');
  const [newEmail, setNewEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  
  // Password Update State (Maintains Double-MFA for maximum safety)
  const [isPasswordUnlocked, setIsPasswordUnlocked] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setNewConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // MFA Modal State
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'unlock_email' | 'unlock_password' | 'execute_password' | null>(null);

  // Vault Auto-Lock (Phase 5)
  useEffect(() => {
    if (emailStage === 'locked' && !isPasswordUnlocked) return;
    
    const timer = setTimeout(() => {
      setEmailStage('locked');
      setIsPasswordUnlocked(false);
      setNewEmail('');
      setOtpCode('');
      setNewPassword('');
      setNewConfirmPassword('');
      addToast('Security settings locked due to inactivity.', 'info');
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearTimeout(timer);
  }, [emailStage, isPasswordUnlocked, addToast]);

  const handleBeginEmailChange = () => {
    if (isMFAEnabled) {
      setPendingAction('unlock_email');
      setShowMfaModal(true);
    } else {
      setEmailStage('input');
    }
  };

  const handleBeginPasswordChange = () => {
    if (isMFAEnabled) {
      setPendingAction('unlock_password');
      setShowMfaModal(true);
    } else {
      setIsPasswordUnlocked(true);
    }
  };

  const handleMfaVerify = async (code: string) => {
    try {
      if (pendingAction === 'unlock_email' || pendingAction === 'unlock_password') {
        // Verification 1: Identity (Current Channel)
        await verifyMfaCode(code);
        
        if (pendingAction === 'unlock_email') setEmailStage('input');
        if (pendingAction === 'unlock_password') setIsPasswordUnlocked(true);
        
        addToast("Identity verified.", "success");
      } else if (pendingAction === 'execute_password') {
        // Password still uses Double-MFA (Identity check for both steps)
        await executePasswordUpdate(code);
      }
      
      setShowMfaModal(false);
      setPendingAction(null);
    } catch (err: any) {
      throw err; // Let modal display error
    }
  };

  const handleSendCode = async () => {
    // Basic validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newEmail || !emailRegex.test(newEmail)) {
      addToast('Please enter a valid email address', 'error');
      return;
    }

    if (newEmail.toLowerCase() === user?.email?.toLowerCase()) {
      addToast('New email must differ from current email', 'error');
      return;
    }

    setIsRequestingOtp(true);
    try {
      // Step 2: Ownership Challenge Prep
      await requestEmailChangeOtp(newEmail);
      addToast("Verification code sent to your new email.", "success");
      setEmailStage('verify');
    } catch (err: any) {
      if (err.message.includes("Identity verification required")) {
        setEmailStage('locked');
        setNewEmail('');
      }
      addToast(err.message || "Failed to send verification code.", "error");
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleVerifyAndUpdate = async () => {
    if (!otpCode || !/^\d{6}$/.test(otpCode)) {
      addToast('Enter the 6-digit verification code', 'error');
      return;
    }

    setIsUpdatingEmail(true);
    try {
      // Verification 2: Ownership (New Channel)
      await updateEmail(newEmail, otpCode);
      addToast('Email updated successfully!', 'success');
      
      // Update global user state immediately for UI snappiness
      if (user) {
        setUser({ ...user, email: newEmail });
      }

      setEmailStage('locked');
      setNewEmail('');
      setOtpCode('');
    } catch (err: any) {
      if (err.message.includes("Identity verification required")) {
        setEmailStage('locked');
        setNewEmail('');
        setOtpCode('');
      }
      addToast(err.message, 'error');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      addToast('Password must be at least 6 characters', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('Passwords do not match', 'error');
      return;
    }

    if (isMFAEnabled) {
      setPendingAction('execute_password');
      setShowMfaModal(true);
    } else {
      await executePasswordUpdate();
    }
  };

  const executePasswordUpdate = async (mfaCode?: string) => {
    setIsUpdatingPassword(true);
    try {
      await updatePassword(newPassword, mfaCode);
      addToast('Password updated successfully!', 'success');
      setNewPassword('');
      setNewConfirmPassword('');
      setIsPasswordUnlocked(false);
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
          Security
        </h3>
        {currentAAL && (
          <div className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${currentAAL === 'aal2' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${currentAAL === 'aal2' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
            Session: {currentAAL.toUpperCase()}
          </div>
        )}
      </div>
      
      <div className="space-y-4">
        {/* MFA Status Card */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isMFAEnabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
              {isCheckingMFA ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50">
                  Two-Factor Authentication
                </h4>
                {isMFAEnabled && (
                  <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] uppercase tracking-wider rounded-md whitespace-nowrap border border-emerald-500/20">
                    Active: {mfaMethod === 'totp' ? 'Authenticator' : 'Email'}
                  </span>
                )}
              </div>
            </div>
          </div>
          {isMFAEnabled ? (
            <AsyncButton
              onClick={onDisableMFA}
              isLoading={isDisablingMFA}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Disable MFA
            </AsyncButton>
          ) : (
            <button
              onClick={onSetupMFA}
              className="px-4 py-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white text-xs font-bold rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-slate-900/10 cursor-pointer"
            >
              Setup MFA
            </button>
          )}
        </div>

        <hr className="border-slate-200 dark:border-white/10" />

        {/* Email Vault - 4 Stage Flow (Refined) */}
        <div className="space-y-4">
          {emailStage === 'locked' ? (
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/50 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CURRENT EMAIL</p>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{user?.email}</p>
              </div>
              <button
                onClick={handleBeginEmailChange}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Change Email
              </button>
            </div>
          ) : emailStage === 'input' ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-widest">NEW EMAIL ADDRESS</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500/30 transition-all duration-200"
                  placeholder="new@example.com"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setEmailStage('locked');
                    setNewEmail('');
                  }}
                  className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <AsyncButton
                  onClick={handleSendCode}
                  isLoading={isRequestingOtp}
                  className="flex-[2] bg-slate-800 dark:bg-white dark:text-slate-950 text-white hover:bg-slate-900 dark:hover:bg-slate-100 rounded-xl py-3 font-bold transition-all duration-300 cursor-pointer"
                >
                  Send Code
                </AsyncButton>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse"></span>
                  Verification Code (Sent to {newEmail})
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-white dark:bg-slate-900 border-2 border-red-500/20 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono text-slate-900 dark:text-slate-50 focus:outline-none focus:border-red-500/50 transition-all duration-200"
                  placeholder="000000"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setEmailStage('input')}
                  className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                >
                  Back
                </button>
                <AsyncButton
                  onClick={handleVerifyAndUpdate}
                  isLoading={isUpdatingEmail}
                  className="flex-[2] bg-red-500 hover:bg-red-600 text-white rounded-xl py-3 font-bold transition-all duration-300 shadow-lg shadow-red-500/25 cursor-pointer"
                >
                  Verify & Update
                </AsyncButton>
              </div>
              <p className="text-[10px] text-center text-slate-500 dark:text-slate-400 mt-2 italic">
                Didn't receive a code? <button onClick={handleSendCode} className="text-red-500 hover:underline font-bold cursor-pointer">Resend</button>
              </p>
            </div>
          )}
        </div>

        <hr className="border-slate-200 dark:border-white/10" />

        {/* Password Vault */}
        <div className="space-y-4">
          {!isPasswordUnlocked ? (
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/50 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PASSWORD</p>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">••••••••••••</p>
              </div>
              <button
                onClick={handleBeginPasswordChange}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Change Password
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-widest">NEW PASSWORD</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500/30 transition-all duration-200"
                  placeholder="••••••••"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-widest">CONFIRM PASSWORD</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setNewConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500/30 transition-all duration-200"
                  placeholder="••••••••"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsPasswordUnlocked(false);
                    setNewPassword('');
                    setNewConfirmPassword('');
                  }}
                  className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <AsyncButton
                  onClick={handleUpdatePassword}
                  isLoading={isUpdatingPassword}
                  className="flex-[2] bg-slate-800 dark:bg-white dark:text-slate-950 text-white hover:bg-slate-900 dark:hover:bg-slate-100 rounded-xl py-3 font-bold transition-all duration-300 cursor-pointer"
                >
                  Update Password
                </AsyncButton>
              </div>
            </div>
          )}
        </div>
      </div>

      <MfaTransactionModal
        isOpen={showMfaModal}
        onClose={() => {
          setShowMfaModal(false);
          setPendingAction(null);
        }}
        onConfirm={handleMfaVerify}
        title={pendingAction?.startsWith('unlock') ? "Identity Verification" : "Authorize Action"}
        description={pendingAction?.startsWith('unlock') ? "Please verify your identity to unlock these security settings." : undefined}
      />
    </section>
  );
}