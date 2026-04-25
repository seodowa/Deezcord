import express, { Response } from 'express';
import verifyUser, { AuthenticatedRequest } from '../middleware/authMiddleware';

const router = express.Router();

// GET /auth/me - Checks if the token is valid and returns user info
router.get('/me', verifyUser, (req: AuthenticatedRequest, res: Response) => {
  // If the code reaches here, the verifyUser middleware successfully passed!
  // req.user was securely attached by the middleware.
  
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