import React, { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { updateProfile, updatePassword } from '../services/userService';
import { mfaListFactors, mfaUnenroll } from '../services/authService';
import { getToken, getAAL } from '../utils/auth';
import AsyncButton from './AsyncButton';
import Modal from './Modal';
import MFASetupModal from './MFASetupModal';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { user, setUser } = useAuth();
  const { addToast } = useToast();
  
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setNewConfirmPassword] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isMFAModalOpen, setIsMFAModalOpen] = useState(false);
  const [isMFAEnabled, setIsMFAEnabled] = useState(false);
  const [isCheckingMFA, setIsCheckingMFA] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [isDisablingMFA, setIsDisablingMFA] = useState(false);
  const [currentAAL, setCurrentAAL] = useState<'aal1' | 'aal2' | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkMFAStatus = async () => {
    const token = getToken();
    if (!token) return;

    setIsCheckingMFA(true);
    try {
      const factors = await mfaListFactors(token);
      const verifiedFactor = factors.all?.find((f: any) => f.status === 'verified');
      if (verifiedFactor) {
        setIsMFAEnabled(true);
        setMfaFactorId(verifiedFactor.id);
      } else {
        setIsMFAEnabled(false);
        setMfaFactorId(null);
      }
    } catch (err) {
      console.error("Failed to check MFA status:", err);
    } finally {
      setIsCheckingMFA(false);
    }
  };

  const handleDisableMFA = async () => {
    if (!mfaFactorId) return;
    
    const confirm = window.confirm("Are you sure you want to disable multi-factor authentication? This will make your account less secure.");
    if (!confirm) return;

    setIsDisablingMFA(true);
    try {
      const token = getToken();
      if (!token) throw new Error("Not authenticated");
      
      await mfaUnenroll(token, mfaFactorId);
      setIsMFAEnabled(false);
      setMfaFactorId(null);
      setCurrentAAL(getAAL());
      addToast("Multi-factor authentication disabled", "success");
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
      setNewPassword('');
      setNewConfirmPassword('');
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Account Settings"
      description="Manage your identity and security."
      maxWidth="max-w-lg"
      isLoading={isUpdatingProfile || isUpdatingPassword}
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
              className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-blue-500/20 cursor-pointer group overflow-hidden shrink-0"
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
                className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-3 font-bold shadow-lg shadow-blue-500/30 transition-all duration-300"
              >
                Save Profile
              </AsyncButton>
            </div>
          </div>
        </section>

        <hr className="border-slate-200/50 dark:border-white/5" />

        {/* Security Section */}
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
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                    Two-Factor Authentication
                    {isMFAEnabled && (
                      <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] uppercase tracking-wider rounded-md">Active</span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {isMFAEnabled 
                      ? "Your account is protected with an additional security layer." 
                      : "Add an extra layer of security to your account."}
                  </p>
                </div>
              </div>
              {isMFAEnabled ? (
                <AsyncButton
                  onClick={handleDisableMFA}
                  isLoading={isDisablingMFA}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold rounded-xl transition-all"
                >
                  Disable MFA
                </AsyncButton>
              ) : (
                <button
                  onClick={() => setIsMFAModalOpen(true)}
                  className="px-4 py-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white text-xs font-bold rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-slate-900/10"
                >
                  Setup MFA
                </button>
              )}
            </div>

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
    </Modal>
  );
}
