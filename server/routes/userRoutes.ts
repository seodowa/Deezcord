import express, { Response } from 'express';
import multer from 'multer';
import { rateLimit } from 'express-rate-limit';
import supabase from '../config/supabaseClient';
import { verifyUser, AuthenticatedRequest, verifyTransactionalMfa } from '../middleware/authMiddleware';
import { isUserOnline } from '../utils/presence';
import { generateEmailOtp, verifyEmailOtp, verifyIdentitySession, consumeIdentitySession } from '../services/mfaService';

const router = express.Router();

// Rate limiter for sensitive account updates
const accountUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP/User to 5 requests per window
  message: { error: "Too many update attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => req.user?.id || req.ip,
});

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit for avatars
  },
});

// GET /me - Checks if the token is valid and returns full user info (PROTECTED)
router.get('/me', verifyUser, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Fetch full profile from public.profiles
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (error) {
    res.status(500).json({ error: "Failed to fetch profile: " + error.message });
    return;
  }

  res.status(200).json({
    status: "authenticated",
    user: {
      ...req.user,
      ...profile
    }
  });
});

// PATCH /profile - Update user profile (PROTECTED)
router.patch('/profile', verifyUser, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  const { username } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    let avatarUrl = undefined;

    // Handle file upload if present
    if (req.file) {
      const file = req.file;
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${userId}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      avatarUrl = publicUrl;
    }

    // Update profile in database
    const updateData: any = {};
    if (username) updateData.username = username;
    if (avatarUrl) updateData.avatar_url = avatarUrl;

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to update profile" });
  }
});

// PATCH /password - Update user password (PROTECTED)
router.patch('/password', verifyUser, verifyTransactionalMfa, accountUpdateLimiter, async (req: AuthenticatedRequest, res: Response) => {
  const { password } = req.body;
  const userId = req.user?.id;

  if (!password || password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { error } = await supabase.auth.admin.updateUserById(userId, { password });

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  res.json({ message: "Password updated successfully" });
});

/**
 * POST /email/request-otp
 * 
 * Step 1: Request a verification code for a new email (Ownership Challenge).
 * Enforces Identity Check: MFA-enabled users must have a valid identity session (unlocked).
 */
router.post('/email/request-otp', verifyUser, accountUpdateLimiter, async (req: AuthenticatedRequest, res: Response) => {
  let { newEmail } = req.body;
  const userId = req.user?.id;
  const currentEmail = req.user?.email;

  // 1. Enforce Identity Check for MFA users
  if (req.user?.app_metadata?.mfa_preference !== 'none') {
    try {
      await verifyIdentitySession(userId);
    } catch (err: any) {
      res.status(403).json({ error: err.message });
      return;
    }
  }

  // Normalize
  newEmail = newEmail?.trim().toLowerCase();

  // 3. Validate format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!newEmail || !emailRegex.test(newEmail)) {
    res.status(400).json({ error: "Valid email is required" });
    return;
  }

  // 4. Same-email guard
  if (newEmail === currentEmail?.toLowerCase()) {
    res.status(400).json({ error: "New email must differ from current email" });
    return;
  }

  try {
    // 5. Duplicate-email check (Accurate via Admin API)
    const { data: existingUsers, error: lookupError } = await supabase.auth.admin.listUsers();
    if (!lookupError && existingUsers?.users?.some(u => u.email?.toLowerCase() === newEmail && u.id !== userId)) {
      res.status(409).json({ error: "This email address is already in use." });
      return;
    }

    // 6. Generate OTP and send to NEW email address (Ownership Challenge)
    const result = await generateEmailOtp(userId!, newEmail, 'email_change', newEmail);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * PATCH /email
 * 
 * Step 2: Finalize email change by verifying the Ownership OTP sent to the new address.
 * Proves ownership of the new email address before executing the change.
 */
router.patch('/email', verifyUser, accountUpdateLimiter, async (req: AuthenticatedRequest, res: Response) => {
  let { newEmail, code } = req.body;
  const userId = req.user?.id;
  const currentEmail = req.user?.email;

  // 1. Enforce Identity Check for MFA users
  if (req.user?.app_metadata?.mfa_preference !== 'none') {
    try {
      await verifyIdentitySession(userId);
    } catch (err: any) {
      res.status(403).json({ error: err.message });
      return;
    }
  }

  // 2. Normalize
  newEmail = newEmail?.trim().toLowerCase();

  // 3. Validate
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!newEmail || !emailRegex.test(newEmail)) {
    res.status(400).json({ error: "Valid email is required" });
    return;
  }
  if (!code || !/^\d{6}$/.test(code)) {
    res.status(400).json({ error: "A valid 6-digit verification code is required." });
    return;
  }
  if (newEmail === currentEmail?.toLowerCase()) {
    res.status(400).json({ error: "New email must differ from current email" });
    return;
  }
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    // 4. Verify OTP — proves ownership of this specific newEmail
    await verifyEmailOtp(userId, code, 'email_change', newEmail);

    // 5. Execute the email change via Admin API
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      email: newEmail,
      email_confirm: true,
    });

    if (error) throw error;

    // 6. Update the profile email as well for consistency
    await supabase
      .from('profiles')
      .update({ email: newEmail })
      .eq('id', userId);

    // 7. Success! Consume the identity session
    if (req.user?.app_metadata?.mfa_preference !== 'none') {
      await consumeIdentitySession(userId);
    }

    res.json({ message: "Email updated successfully." });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to update email." });
  }
});

// GET /search - Search for users by username
router.get('/search', verifyUser, async (req: AuthenticatedRequest, res: Response) => {
  const { q } = req.query;
  const myId = req.user?.id;

  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    res.json([]);
    return;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .neq('id', myId)
      .ilike('username', `%${q}%`)
      .limit(10);

    if (error) throw error;

    // Check online status for each found user
    const usersWithPresence = data.map(u => ({
      ...u,
      isOnline: isUserOnline(u.id)
    }));

    res.json(usersWithPresence);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Search failed" });
  }
});

export default router;
