import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { updateProfile } from '../services/userService';
import { mfaListFactors, mfaUnenroll } from '../services/authService';
import { getToken, getAAL } from '../utils/auth';
import AsyncButton from './AsyncButton';
import Modal from './Modal';
import MFASetupModal from './MFASetupModal';
import MFADisableModal from './MFADisableModal';
import SecuritySettings from './SecuritySettings';
import MfaTransactionModal from './MfaTransactionModal';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { user, setUser } = useAuth();
  const { addToast } = useToast();
  
  const [username, setUsername] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isMFAModalOpen, setIsMFAModalOpen] = useState(false);
  const [isMFAEnabled, setIsMFAEnabled] = useState(false);
  const [isCheckingMFA, setIsCheckingMFA] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaMethod, setMfaMethod] = useState<'totp' | 'email' | 'none'>('none');
  const [isDisablingMFA, setIsDisablingMFA] = useState(false);
  const [isConfirmDisableMFAOpen, setIsConfirmDisableMFAOpen] = useState(false);
  const [isUnenrollChallengeOpen, setIsUnenrollChallengeOpen] = useState(false);
  const [currentAAL, setCurrentAAL] = useState<'aal1' | 'aal2' | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkMFAStatus = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    setIsCheckingMFA(true);
    try {
      // 1. Check local user metadata (covers both, especially Email)
      const preference = user?.app_metadata?.mfa_preference || 'none';
      
      if (preference === 'email') {
        setIsMFAEnabled(true);
        setMfaMethod('email');
        setMfaFactorId(null);
      } else {
        // 2. Double check Supabase factors for TOTP
        const factors = await mfaListFactors(token);
        const verifiedFactor = factors.all?.find((f: any) => f.status === 'verified');
        if (verifiedFactor) {
          setIsMFAEnabled(true);
          setMfaMethod('totp');
          setMfaFactorId(verifiedFactor.id);
        } else {
          setIsMFAEnabled(false);
          setMfaMethod('none');
          setMfaFactorId(null);
        }
      }
    } catch (err) {
      console.error("Failed to check MFA status:", err);
    } finally {
      setIsCheckingMFA(false);
    }
  }, [user]);

  const handleDisableMFA = async (verificationCode?: string) => {
    setIsDisablingMFA(true);
    try {
      const token = getToken();
      if (!token) throw new Error("Not authenticated");
      
      // For Email MFA, we don't have a factorId, so we pass null/undefined
      // For TOTP, we pass the specific factorId
      await mfaUnenroll(token, mfaFactorId || undefined, verificationCode);
      
      // Update local user state immediately on success
      if (user) {
        setUser({
          ...user,
          app_metadata: { ...user.app_metadata, mfa_preference: 'none' }
        });
      }
      
      setIsMFAEnabled(false);
      setMfaMethod('none');
      setMfaFactorId(null);
      setCurrentAAL(getAAL());
      
      addToast("Multi-factor authentication disabled", "success");
      setIsConfirmDisableMFAOpen(false);
      setIsUnenrollChallengeOpen(false);
    } catch (err: any) {
      addToast(err.message || "Failed to disable MFA", "error");
    } finally {
      setIsDisablingMFA(false);
    }
  };

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    if (isOpen && user) {
      setUsername(user.username || '');
      setPreviewUrl(user.avatar_url || null);
      setSelectedFile(null);
      checkMFAStatus();
      setCurrentAAL(getAAL());
    }
    setPrevIsOpen(isOpen);
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        addToast('File size must be less than 2MB', 'error');
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpdateProfile = async () => {
    if (!username.trim()) {
      addToast('Username cannot be empty', 'error');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const updatedData = await updateProfile(username, selectedFile);
      setUser({ ...user, ...updatedData });
      addToast('Profile updated successfully!', 'success');
      setSelectedFile(null);
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to update profile', 'error');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Account Settings"
      description="Manage your identity and security."
      maxWidth="max-w-lg"
      isLoading={isUpdatingProfile}
    >
      <div className="space-y-10">
        {/* Profile Section */}
        <section className="space-y-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Public Profile
          </h3>
          
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="relative w-24 h-24 rounded-3xl bg-linear-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-blue-500/20 cursor-pointer group overflow-hidden shrink-0"
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
              ) : (
                <span>{(user?.username || 'U').substring(0, 1).toUpperCase()}</span>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/*"
            />
            
            <div className="flex-1 w-full space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">USERNAME</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                  placeholder="Username"
                />
              </div>
              <AsyncButton
                onClick={handleUpdateProfile}
                isLoading={isUpdatingProfile}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-3 font-bold shadow-lg shadow-blue-500/30 transition-all duration-300 cursor-pointer"
              >
                Save Profile
              </AsyncButton>
            </div>
          </div>
        </section>

        <hr className="border-slate-200/50 dark:border-white/5" />

        <SecuritySettings 
          currentAAL={currentAAL}
          isMFAEnabled={isMFAEnabled}
          mfaMethod={mfaMethod}
          isCheckingMFA={isCheckingMFA}
          isDisablingMFA={isDisablingMFA}
          onSetupMFA={() => setIsMFAModalOpen(true)}
          onDisableMFA={() => setIsConfirmDisableMFAOpen(true)}
        />
      </div>

      <MFASetupModal 
        isOpen={isMFAModalOpen} 
        onClose={() => setIsMFAModalOpen(false)} 
        onSuccess={() => {
          checkMFAStatus();
          setCurrentAAL(getAAL());
          setIsMFAModalOpen(false);
        }}
      />

      <MFADisableModal
        isOpen={isConfirmDisableMFAOpen}
        onClose={() => setIsConfirmDisableMFAOpen(false)}
        onConfirm={async () => {
          setIsConfirmDisableMFAOpen(false);
          setIsUnenrollChallengeOpen(true);
        }}
        isLoading={isDisablingMFA}
      />

      <MfaTransactionModal
        isOpen={isUnenrollChallengeOpen}
        onClose={() => setIsUnenrollChallengeOpen(false)}
        onConfirm={handleDisableMFA}
        title="Verify Identity to Disable MFA"
        description="Please provide a security code to confirm you want to disable two-factor authentication."
        actionLabel="Confirm Disable"
      />
    </Modal>
  );
}
