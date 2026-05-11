import { useState, useCallback } from 'react';
import { mfaListFactors } from '../services/authService';
import { getToken } from '../utils/auth';
import { useToast } from './useToast';

/**
 * useMFAChallenge
 * 
 * A hook to handle the MFA challenge flow.
 * Returns state and functions to manage the MFAChallengeModal.
 */
export function useMFAChallenge() {
  const [isChallengeOpen, setIsChallengeOpen] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [overrideToken, setOverrideToken] = useState<string | null>(null);
  const [onSuccessCallback, setOnSuccessCallback] = useState<{ fn: (token: string) => void } | null>(null);
  const { addToast } = useToast();

  const startChallenge = useCallback(async (onSuccess: (token: string) => void, tokenOverride?: string) => {
    try {
      const token = tokenOverride || getToken();
      if (!token) throw new Error("Not authenticated");

      // 1. Fetch factors to find a TOTP factor
      const factors = await mfaListFactors(token);
      
      // Filter for verified TOTP factors
      const totpFactor = factors.all.find((f: any) => f.factor_type === 'totp' && f.status === 'verified');

      if (!totpFactor) {
        addToast("MFA is required but no verified factors found. Please set up MFA in your profile.", "error");
        return;
      }

      setFactorId(totpFactor.id);
      setOverrideToken(tokenOverride || null);
      setOnSuccessCallback({ fn: onSuccess });
      setIsChallengeOpen(true);
    } catch (err: any) {
      console.error("Failed to start MFA challenge:", err);
      addToast(err.message || "Failed to initiate security verification.", "error");
    }
  }, [addToast]);

  const closeChallenge = useCallback(() => {
    setIsChallengeOpen(false);
    setFactorId(null);
    setOverrideToken(null);
    setOnSuccessCallback(null);
  }, []);

  const handleVerified = useCallback((newToken: string) => {
    if (onSuccessCallback) {
      onSuccessCallback.fn(newToken);
    }
    closeChallenge();
  }, [onSuccessCallback, closeChallenge]);

  return {
    isChallengeOpen,
    factorId,
    overrideToken,
    startChallenge,
    closeChallenge,
    handleVerified
  };
}
