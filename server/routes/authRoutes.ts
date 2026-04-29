import express, { Request, Response } from 'express';
import { verifyUser, AuthenticatedRequest } from '../middleware/authMiddleware';
import { signUp } from '../utils/auth';

const router = express.Router();

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

// GET /auth/me - Checks if the token is valid and returns user info
router.get('/me', verifyUser, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  res.status(200).json({
    status: "authenticated",
    message: "Your token is valid!",
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      last_sign_in: req.user.last_sign_in_at
    }
  });
});

export default router;