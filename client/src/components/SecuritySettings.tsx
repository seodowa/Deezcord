import { useState } from 'react';
import { useToast } from '../hooks/useToast';
import { updatePassword } from '../services/userService';
import AsyncButton from './AsyncButton';

interface SecuritySettingsProps {
  currentAAL: 'aal1' | 'aal2' | null;
  isMFAEnabled: boolean;
  mfaMethod: 'totp' | 'email' | 'none';
  isCheckingMFA: boolean;
  isDisablingMFA: boolean;
  onSetupMFA: () => void;
  onDisableMFA: () => void;
}

/**
 * SecuritySettings
 * 
 * Extracted component from UserProfileModal to manage MFA status and password updates.
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
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setNewConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      addToast('Password must be at least 6 characters', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('Passwords do not match', 'error');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updatePassword(newPassword);
      addToast('Password updated successfully!', 'success');
      setNewPassword('');
      setNewConfirmPassword('');
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to update password', 'error');
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
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold rounded-xl transition-all"
            >
              Disable MFA
            </AsyncButton>
          ) : (
            <button
              onClick={onSetupMFA}
              className="px-4 py-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white text-xs font-bold rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-slate-900/10"
            >
              Setup MFA
            </button>
          )}
        </div>

        {/* Password Update Fields */}
        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">NEW PASSWORD</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500/30 transition-all duration-200"
            placeholder="••••••••"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">CONFIRM PASSWORD</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setNewConfirmPassword(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500/30 transition-all duration-200"
            placeholder="••••••••"
          />
        </div>
        <AsyncButton
          onClick={handleUpdatePassword}
          isLoading={isUpdatingPassword}
          className="w-full bg-slate-800 dark:bg-white dark:text-slate-950 text-white hover:bg-slate-900 dark:hover:bg-slate-100 rounded-xl py-3 font-bold transition-all duration-300"
        >
          Update Password
        </AsyncButton>
      </div>
    </section>
  );
}
