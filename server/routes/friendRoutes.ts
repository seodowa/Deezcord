import express, { Response } from 'express';
import supabase from '../config/supabaseClient';
import { verifyUser, AuthenticatedRequest } from '../middleware/authMiddleware';
import { isUserOnline } from '../utils/presence';

const router = express.Router();

// --- Friendship Endpoints ---

// GET /rooms/users/search - Search for users by username
router.get('/users/search', verifyUser, async (req: AuthenticatedRequest, res: Response) => {
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

// GET /rooms/friends/list - Get all accepted friends for the current user
router.get('/friends/list', verifyUser, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  // We query where requester_id = userId AND status = 'accepted'
  const { data, error } = await supabase
    .from('friendships')
    .select('addressee_id, status, profiles!friendships_addressee_id_fkey(id, username, avatar_url, email)')
    .eq('requester_id', userId)
    .eq('status', 'accepted');

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  // Flatten the profile data for the frontend
  const friends = data.map(f => {
    const p = Array.isArray(f.profiles) ? f.profiles[0] : f.profiles;
    return {
      id: p?.id,
      username: p?.username || 'Unknown',
      avatar_url: p?.avatar_url || null,
      email: p?.email || null,
      isOnline: p?.id ? isUserOnline(p.id) : false,
      status: f.status
    };
  });

  res.status(200).json(friends);
});

// GET /rooms/friends/pending - Get received pending friend requests
router.get('/friends/pending', verifyUser, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  // We query where addressee_id = userId AND status = 'pending'
  const { data, error } = await supabase
    .from('friendships')
    .select('requester_id, status, profiles!friendships_requester_id_fkey(id, username, avatar_url, email)')
    .eq('addressee_id', userId)
    .eq('status', 'pending');

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  // Flatten the profile data for the frontend
  const requests = data.map(f => {
    const p = Array.isArray(f.profiles) ? f.profiles[0] : f.profiles;
    return {
      id: p?.id,
      username: p?.username || 'Unknown',
      avatar_url: p?.avatar_url || null,
      email: p?.email || null,
      isOnline: p?.id ? isUserOnline(p.id) : false,
      status: f.status
    };
  });

  res.status(200).json(requests);
});

// GET /rooms/friends/status/:userId - Get relation status with a specific user
router.get('/friends/status/:targetId', verifyUser, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { targetId } = req.params;

  // Check if I sent a request or accepted them
  const { data: outRelation, error: outErr } = await supabase
    .from('friendships')
    .select('status')
    .eq('requester_id', userId)
    .eq('addressee_id', targetId)
    .maybeSingle();

  // Check if they sent me a request
  const { data: inRelation, error: inErr } = await supabase
    .from('friendships')
    .select('status')
    .eq('requester_id', targetId)
    .eq('addressee_id', userId)
    .maybeSingle();

  if (outErr || inErr) {
    res.status(500).json({ error: 'Failed to fetch status' });
    return;
  }

  if (outRelation?.status === 'accepted' || inRelation?.status === 'accepted') {
    res.json({ status: 'friends' });
  } else if (outRelation?.status === 'pending') {
    res.json({ status: 'request_sent' });
  } else if (inRelation?.status === 'pending') {
    res.json({ status: 'request_received' });
  } else {
    res.json({ status: 'none' });
  }
});

// POST /rooms/friends/request/:addresseeId - Send a friend request
router.post('/friends/request/:addresseeId', verifyUser, async (req: AuthenticatedRequest, res: Response) => {
  const requesterId = req.user?.id;
  const { addresseeId } = req.params;

  if (requesterId === addresseeId) {
    res.status(400).json({ error: "You cannot add yourself as a friend" });
    return;
  }

  // Check if there is already an inverse pending request
  const { data: existingRequest } = await supabase
    .from('friendships')
    .select('status')
    .eq('requester_id', addresseeId)
    .eq('addressee_id', requesterId)
    .maybeSingle();

  if (existingRequest?.status === 'pending') {
    // Auto-accept if they already sent us a request
    await supabase.from('friendships').update({ status: 'accepted' }).eq('requester_id', addresseeId).eq('addressee_id', requesterId);
    await supabase.from('friendships').upsert([{ requester_id: requesterId, addressee_id: addresseeId, status: 'accepted' }]);
    
    const io = req.app.get('io');
    if (io) {
      io.to(addresseeId).emit('friend_request_accepted', { addresseeId: requesterId });
    }
    res.status(200).json({ message: "Friend request accepted automatically" });
    return;
  }

  // Insert single row for pending request
  const { error } = await supabase
    .from('friendships')
    .insert([{ requester_id: requesterId, addressee_id: addresseeId, status: 'pending' }]);

  if (error) {
    if (error.code === '23505') {
      // Unique constraint violation means it already exists (either pending or accepted)
      res.status(200).json({ message: "Friend request already sent" });
      return;
    }
    res.status(500).json({ error: error.message });
    return;
  }

  const io = req.app.get('io');
  if (io) {
    io.to(addresseeId).emit('friend_request_received', { requesterId });
  }

  res.status(200).json({ message: "Friend request sent" });
});

// POST /rooms/friends/accept/:requesterId - Accept a friend request
router.post('/friends/accept/:requesterId', verifyUser, async (req: AuthenticatedRequest, res: Response) => {
  const myId = req.user?.id;
  const { requesterId } = req.params;

  // Update their request to me to 'accepted'
  const { error: updateErr } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('requester_id', requesterId)
    .eq('addressee_id', myId);

  if (updateErr) {
    res.status(500).json({ error: updateErr.message });
    return;
  }

  // Insert symmetric 'accepted' row from me to them
  const { error: insertErr } = await supabase
    .from('friendships')
    .upsert([{ requester_id: myId, addressee_id: requesterId, status: 'accepted' }]);

  if (insertErr) {
    res.status(500).json({ error: insertErr.message });
    return;
  }

  const io = req.app.get('io');
  if (io) {
    io.to(requesterId).emit('friend_request_accepted', { addresseeId: myId });
  }

  res.status(200).json({ message: "Friend request accepted" });
});

// DELETE /rooms/friends/:targetId - Remove a friend or cancel a request
router.delete('/friends/:targetId', verifyUser, async (req: AuthenticatedRequest, res: Response) => {
  const requesterId = req.user?.id;
  const { targetId } = req.params;

  // Remove both directions just in case it was accepted or pending
  const { error } = await supabase
    .from('friendships')
    .delete()
    .or(`and(requester_id.eq.${requesterId},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${requesterId})`);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const io = req.app.get('io');
  if (io) {
    io.to(targetId).emit('friend_removed', { removedBy: requesterId });
  }

  res.status(200).json({ message: "Friend removed or request cancelled" });
});


export default router;