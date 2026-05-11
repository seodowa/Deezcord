import express, { Request, Response } from 'express';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import supabase from '../config/supabaseClient';
import { verifyUser, AuthenticatedRequest } from '../middleware/authMiddleware';
import signIn, { signUp, forgotPassword, resetPassword } from '../utils/auth';

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
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      res.status(400).json({ error: "Identifier (username or email) and password are required." });
      return;
    }

    const { token, user } = await signIn(identifier, password);
    
    res.status(200).json({
      message: "Login successful",
      token,
      user
    });
  } catch (error: any) {
    res.status(401).json({ error: error.message || "Failed to login" });
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

    // 1. Clean up any existing unverified factors
    const { data: factors, error: factorsError } = await userClient.auth.mfa.listFactors();
    if (!factorsError && factors) {
      const unverifiedFactors = factors.all.filter(f => f.status === 'unverified');
      for (const factor of unverifiedFactors) {
        console.log(`[MFA Enroll] Cleaning up unverified factor: ${factor.id}`);
        await userClient.auth.mfa.unenroll({ factorId: factor.id });
      }
    }

    // 2. Start new enrollment
    const { data, error } = await userClient.auth.mfa.enroll({
      factorType: 'totp'
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

    res.status(200).json({
      message: "MFA verified successfully",
      ...verifyData
    });
  } catch (error: any) {
    console.error("[MFA Verify] Error:", error.message);
    res.status(400).json({ error: error.message || "Failed to verify MFA code" });
  }
});

// DELETE /auth/mfa/unenroll - Remove an MFA factor
router.delete('/mfa/unenroll', verifyUser, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { factorId } = req.body;
    const authHeader = req.headers.authorization!;
    const token = authHeader.split(' ')[1];

    if (!factorId) {
      res.status(400).json({ error: "Factor ID is required." });
      return;
    }

    const userClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data, error } = await userClient.auth.mfa.unenroll({ factorId });

    if (error) throw error;

    res.status(200).json({ message: "MFA factor removed successfully", ...data });
  } catch (error: any) {
    console.error("[MFA Unenroll] Error:", error.message);
    res.status(400).json({ error: error.message || "Failed to remove MFA factor" });
  }
});

export default router;
