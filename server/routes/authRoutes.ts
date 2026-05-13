import express, { Request, Response } from 'express';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import supabase from '../config/supabaseClient';
import { verifyUser, verifyTransactionalMfa, AuthenticatedRequest } from '../middleware/authMiddleware';
import signIn, { signUp, forgotPassword, resetPassword, refreshSession } from '../utils/auth';
import { generateEmailOtp, verifyEmailOtp, createIdentitySession } from '../services/mfaService';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit for avatars
  },
});

// POST /auth/register - Create a new user
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: "Username, email, and password are required." });
      return;
    }

    const data = await signUp(email, password, username);
    
    res.status(201).json({
      message: "Registration successful",
      user: data.user
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to register" });
  }
});

// POST /auth/login - Log in an existing user
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier, password, deviceId } = req.body;

    if (!identifier || !password || !deviceId) {
      res.status(400).json({ error: "Identifier, password, and device ID are required." });
      return;
    }

    const { token, refreshToken, user } = await signIn(identifier, password, deviceId);
    
    res.status(200).json({
      message: "Login successful",
      token,
      refreshToken,
      user
    });
  } catch (error: any) {
    res.status(401).json({ error: error.message || "Failed to login" });
  }
});

// POST /auth/logout - Log out and deregister the current device
router.post('/logout', verifyUser, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { user } = req;
    const deviceId = req.headers['x-device-id'] as string;

    if (!user || !deviceId) {
      res.status(400).json({ error: "User and device ID are required for logout." });
      return;
    }

    // Remove the current device from app_metadata.devices
    const currentDevices = user.app_metadata?.devices || [];
    const updatedDevices = currentDevices.filter((d: string) => d !== deviceId);

    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      app_metadata: {
        ...user.app_metadata,
        devices: updatedDevices
      }
    });

    if (error) throw error;

    res.status(200).json({ message: "Logout successful and device deregistered." });
  } catch (error: any) {
    console.error("[Logout] Error:", error.message);
    res.status(400).json({ error: error.message || "Failed to logout" });
  }
});

// POST /auth/refresh - Refresh an expired session
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken, deviceId } = req.body;

    if (!refreshToken || !deviceId) {
      res.status(400).json({ error: "Refresh token and device ID are required." });
      return;
    }

    const { token, refreshToken: newRefreshToken, user } = await refreshSession(refreshToken, deviceId);
    
    res.status(200).json({
      token,
      refreshToken: newRefreshToken,
      user
    });
  } catch (error: any) {
    res.status(401).json({ error: error.message || "Failed to refresh session" });
  }
});

// POST /auth/forgot-password - Request a password reset email
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: "Email is required." });
      return;
    }

    await forgotPassword(email);
    
    res.status(200).json({
      message: "If an account exists, a reset link has been sent."
    });
  } catch (error: any) {
    console.error("[AuthRoute] Forgot Password Error:", error);
    res.status(400).json({ error: error.message || "Failed to send reset link" });
  }
});

// POST /auth/reset-password - Reset password using a code
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, password } = req.body;

    if (!code || !password) {
      res.status(400).json({ error: "Code and new password are required." });
      return;
    }

    await resetPassword(code, password);
    
    res.status(200).json({
      message: "Password reset successful"
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to reset password" });
  }
});

/**
 * POST /auth/mfa/challenge-verify
 * 
 * A no-op route used to 'unlock' the UI or verify identity via MFA.
 * It relies on verifyTransactionalMfa middleware to do the heavy lifting.
 */
router.post('/mfa/challenge-verify', verifyUser, verifyTransactionalMfa, async (req: AuthenticatedRequest, res: Response) => {
  // Create a short-lived identity session in the database
  await createIdentitySession(req.user.id);

  res.status(200).json({ 
    message: "Identity verified successfully",
    aal: req.user?.app_metadata?.mfa_preference === 'none' ? 'aal1' : 'aal2'
  });
});

/**
 * MFA ROUTES
 */

// GET /auth/mfa/enroll - Start the enrollment process
router.get('/mfa/enroll', verifyUser, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization!;
    const token = authHeader.split(' ')[1];

    // Create a client authenticated as the user
    const userClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    // 1. Clean up any existing factors to prevent collisions
    const { data: factors, error: factorsError } = await userClient.auth.mfa.listFactors();
    if (!factorsError && factors && factors.all.length > 0) {
      for (const factor of factors.all) {
        console.log(`[MFA Enroll] Cleaning up existing factor: ${factor.id} (${factor.status})`);
        await userClient.auth.mfa.unenroll({ factorId: factor.id });
      }
    }

    // 2. Start new enrollment with a friendly name
    const { data, error } = await userClient.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Deezcord MFA'
    });

    if (error) throw error;

    res.status(200).json(data);
  } catch (error: any) {
    console.error("[MFA Enroll] Error:", error.message);
    res.status(400).json({ error: error.message || "Failed to start MFA enrollment" });
  }
});

// GET /auth/mfa/factors - List enrolled MFA factors
router.get('/mfa/factors', verifyUser, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization!;
    const token = authHeader.split(' ')[1];

    const userClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data, error } = await userClient.auth.mfa.listFactors();

    if (error) throw error;

    res.status(200).json(data);
  } catch (error: any) {
    console.error("[MFA Factors] Error:", error.message);
    res.status(400).json({ error: error.message || "Failed to list MFA factors" });
  }
});

// POST /auth/mfa/challenge - Verify an MFA code
router.post('/mfa/verify', verifyUser, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { factorId, code } = req.body;
    const authHeader = req.headers.authorization!;
    const token = authHeader.split(' ')[1];

    if (!factorId || !code) {
      res.status(400).json({ error: "Factor ID and code are required." });
      return;
    }

    // Create a client authenticated as the user
    const userClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    // 1. Create a challenge
    const { data: challengeData, error: challengeError } = await userClient.auth.mfa.challenge({
      factorId
    });

    if (challengeError) throw challengeError;

    // 2. Verify the challenge
    const { data: verifyData, error: verifyError } = await userClient.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code
    });

    if (verifyError) throw verifyError;

    // 3. Success! Update the user's preference in app_metadata
    await supabase.auth.admin.updateUserById(req.user.id, {
      app_metadata: {
        ...req.user.app_metadata,
        mfa_preference: 'totp'
      }
    });

    res.status(200).json({
      message: "MFA verified successfully",
      ...verifyData
    });
  } catch (error: any) {
    console.error("[MFA Verify] Error:", error.message);
    res.status(400).json({ error: error.message || "Failed to verify MFA code" });
  }
});

// POST /auth/mfa/email/request - Request a code for Email MFA
router.post('/mfa/email/request', verifyUser, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { purpose } = req.body;
    const { user } = req;

    if (!user || !user.email) {
      res.status(400).json({ error: "User email not found." });
      return;
    }

    const result = await generateEmailOtp(user.id, user.email, purpose || 'transactional');
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to send security code." });
  }
});

// POST /auth/mfa/email/setup-verify - Verify Email MFA setup and update preference
router.post('/mfa/email/setup-verify', verifyUser, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { code } = req.body;
    const { user } = req;

    if (!code) {
      res.status(400).json({ error: "Verification code is required." });
      return;
    }

    // 1. Verify the code
    await verifyEmailOtp(user.id, code, 'setup');

    // 2. Update preference to email
    await supabase.auth.admin.updateUserById(user.id, {
      app_metadata: {
        ...user.app_metadata,
        mfa_preference: 'email'
      }
    });

    res.status(200).json({ message: "Email MFA enabled successfully." });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to verify Email MFA." });
  }
});

// POST /auth/mfa/email/verify - Generic Email OTP verification (for login)
router.post('/mfa/email/verify', verifyUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, purpose } = req.body;
    const { user } = req;

    if (!code || !purpose) {
      return res.status(400).json({ error: "Code and purpose are required." });
    }

    await verifyEmailOtp(user.id, code, purpose);
    res.status(200).json({ message: "Verification successful." });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Verification failed." });
  }
});

// DELETE /auth/mfa/unenroll - Remove an MFA factor
router.delete('/mfa/unenroll', verifyUser, verifyTransactionalMfa, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { factorId } = req.body;
    const authHeader = req.headers.authorization!;
    const token = authHeader.split(' ')[1];

    if (!factorId) {
      // If no factorId, they might be unenrolling from Email MFA
      const { user } = req;
      if (user.app_metadata?.mfa_preference === 'email') {
        await supabase.auth.admin.updateUserById(user.id, {
          app_metadata: { ...user.app_metadata, mfa_preference: 'none' }
        });
        res.status(200).json({ message: "Email MFA removed successfully" });
        return;
      }
      res.status(400).json({ error: "Factor ID is required." });
      return;
    }

    const userClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data, error } = await userClient.auth.mfa.unenroll({ factorId });

    if (error) throw error;

    // Update preference to none
    await supabase.auth.admin.updateUserById(req.user.id, {
      app_metadata: { ...req.user.app_metadata, mfa_preference: 'none' }
    });

    res.status(200).json({ message: "MFA factor removed successfully", ...data });
  } catch (error: any) {
    console.error("[MFA Unenroll] Error:", error.message);
    res.status(400).json({ error: error.message || "Failed to remove MFA factor" });
  }
});

export default router;
