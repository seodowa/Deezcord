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

export default router;
