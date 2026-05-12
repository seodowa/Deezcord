import express, { Response } from 'express';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import supabase from '../config/supabaseClient';
import { verifyUser, AuthenticatedRequest } from '../middleware/authMiddleware';
import { isUserOnline } from '../utils/presence';

const router = express.Router();

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
  const file = req.file;

  const updateData: any = {};
  if (username) {
    if (username.length < 3 || username.length > 30) {
      res.status(400).json({ error: "Username must be 3-30 characters" });
      return;
    }
    updateData.username = username;
  }

  if (file) {
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      updateData.avatar_url = publicUrl;
    } else {
      console.error('Avatar upload error:', uploadError);
    }
  }

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "No update data provided" });
    return;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
});

// PATCH /password - Update user password (PROTECTED)
router.patch('/password', verifyUser, async (req: AuthenticatedRequest, res: Response) => {
  const { password } = req.body;
  const token = req.headers.authorization?.split(' ')[1];

  if (!password || password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // We need to use the token to update the user's password in auth.users
  const userClient = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_KEY || '', {
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

  const { error } = await userClient.auth.updateUser({ password });

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  res.json({ message: "Password updated successfully" });
});

// GET /search - Search for users by username
router.get('/search', verifyUser, async (req: AuthenticatedRequest, res: Response) => {
  const { q } = req.query;
  const myId = req.user?.id;

  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    res.json([]);
    return;
  }

  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .ilike('username', `%${q.trim()}%`)
    .neq('id', myId)
    .limit(10);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  // Check online status for each user
  const usersWithPresence = users?.map(u => ({
    ...u,
    isOnline: isUserOnline(u.id)
  }));

  res.json(usersWithPresence || []);
});

export default router;