import express, { Response } from 'express';
import multer from 'multer';
import supabase from '../config/supabaseClient';
import { verifyUser, verifyRoomMember, verifyRoomOwner, AuthenticatedRequest } from '../middleware/authMiddleware';
import { isUserOnline } from '../utils/presence';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Add input validation helper
const validateRoomName = (name: any): boolean => {
  if (typeof name !== 'string') return false;
  if (name.trim().length === 0) return false;
  if (name.length > 100) return false;
  return true;
};

// GET /rooms/:roomId/channels - Fetch channels for a room
router.get('/:roomId/channels', verifyUser, verifyRoomMember, async (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;

  const { data: channels, error } = await supabase
    .from('channels')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(channels || []);
});

// POST /rooms/:roomId/channels - Create a new channel (OWNER ONLY)
router.post('/:roomId/channels', verifyUser, verifyRoomOwner, async (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;
  const { name, type } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: "Valid channel name is required" });
    return;
  }

  const { data: channel, error } = await supabase
    .from('channels')
    .insert([{ 
      room_id: roomId,
      name: name.trim().toLowerCase().replace(/\s+/g, '-'),
      type: type || 'text'
    }])
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json(channel);
});

// GET /rooms/:roomId/channels/:channelId/messages - Fetch message history for a channel (PROTECTED)
router.get('/:roomId/channels/:channelId/messages', verifyUser, verifyRoomMember, async (req: AuthenticatedRequest, res: Response) => {
  const { channelId } = req.params;

  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: true });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  if (!messages || messages.length === 0) {
    res.json([]);
    return;
  }

  // Fetch profiles for these users to get their latest avatars and usernames
  const userIds = Array.from(new Set(messages.map(m => m.user_id).filter(id => id !== null)));
  const usernames = Array.from(new Set(messages.map(m => m.username).filter(u => u !== null)));

  const { data: profilesById } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', userIds);

  const { data: profilesByUsername } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('username', usernames);

  const messagesWithAvatars = messages.map(msg => {
    let profile = profilesById?.find(p => p.id === msg.user_id);
    if (!profile) {
      profile = profilesByUsername?.find(p => p.username.toLowerCase() === msg.username.toLowerCase());
    }

    return {
      ...msg,
      username: profile?.username || msg.username,
      avatar_url: profile?.avatar_url || null
    };
  });

  // Fetch reactions for these messages
  const { data: allReactions } = await supabase
    .from('message_reactions')
    .select('id, message_id, user_id, emoji, profiles(username)')
    .in('message_id', messages.map(m => m.id));

  const messagesWithReactions = messagesWithAvatars.map(msg => ({
    ...msg,
    parent_message: msg.parent_id 
      ? messages.find(m => m.id === msg.parent_id) 
        ? { 
            username: messages.find(m => m.id === msg.parent_id)!.username, 
            content: messages.find(m => m.id === msg.parent_id)!.content 
          }
        : null
      : null,
    reactions: (allReactions || [])
      .filter(r => r.message_id === msg.id)
      .map(r => ({
        id: r.id,
        message_id: r.message_id,
        user_id: r.user_id,
        emoji: r.emoji,
        username: (r as any).profiles?.username
      }))
  }));

  res.json(messagesWithReactions);
});

// POST /rooms/:roomId/channels/:channelId/messages/upload - Upload a file for a message (PROTECTED)
router.post('/:roomId/channels/:channelId/messages/upload', verifyUser, verifyRoomMember, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  const file = req.file;

  if (!file) {
    res.status(400).json({ error: "No file provided" });
    return;
  }

  try {
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `attachments/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('message_attachments')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('message_attachments')
      .getPublicUrl(filePath);
    
    res.status(200).json({ file_url: publicUrl });
  } catch (error: any) {
    console.error('File upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload file' });
  }
});

// POST /rooms - Create a new chat room (PROTECTED)
router.post('/', verifyUser, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  const { name } = req.body;
  const userId = req.user?.id;
  const file = req.file;

  if (!name) {
    res.status(400).json({ error: "Room name is required" });
    return;
  } else if (!validateRoomName(name)) {
    res.status(400).json({ error: "Room name must be 1-100 characters" });
    return;
  }

  let roomProfileUrl = null;

  // Handle file upload if present
  if (file) {
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('room_profiles')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      // We'll continue even if upload fails, just without a profile picture
    } else {
      const { data: { publicUrl } } = supabase.storage
        .from('room_profiles')
        .getPublicUrl(filePath);
      
      roomProfileUrl = publicUrl;
    }
  }

  const { data: roomData, error: roomError } = await supabase
    .from('rooms')
    .insert([{ 
      name: name,
      room_profile: roomProfileUrl 
    }])
    .select()
    .single();

  if (roomError) {
    if (roomError.code === '23505') {
      res.status(409).json({ error: "A room with this name already exists" });
      return;
    }
    res.status(500).json({ error: roomError.message });
    return;
  }

  // Add the creator as the owner in room_members
  const { error: memberError } = await supabase
    .from('room_members')
    .insert([{ 
      room_id: roomData.id, 
      user_id: userId,
      role: 'owner' 
    }]);

  if (memberError) {
    res.status(500).json({ error: "Room created but failed to add you as a member: " + memberError.message });
    return;
  }

  const io = req.app.get('io');
  if (io) {
    io.emit('room_created', roomData);
  }

  res.status(201).json(roomData); 
});

// POST /rooms/:roomId/join - Join a room (PROTECTED)
router.post('/:roomId/join', verifyUser, async (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;
  const userId = req.user?.id;

  // Check if already a member
  const { data: existingMember } = await supabase
    .from('room_members')
    .select('*')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .single();

  if (existingMember) {
    res.status(400).json({ error: "You are already a member of this room" });
    return;
  }

  const { error } = await supabase
    .from('room_members')
    .insert([{ 
      room_id: roomId, 
      user_id: userId,
      role: 'member' 
    }]);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json({ message: "Successfully joined the room" });
});

// GET /rooms/:roomId/members - Fetch members of a room (PROTECTED)
router.get('/:roomId/members', verifyUser, verifyRoomMember, async (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;

  // 1. Fetch room members first
  const { data: members, error: membersError } = await supabase
    .from('room_members')
    .select('role, user_id')
    .eq('room_id', roomId);

  if (membersError) {
    res.status(500).json({ error: membersError.message });
    return;
  }

  if (!members || members.length === 0) {
    res.json([]);
    return;
  }

  // 2. Extract user IDs and fetch their profiles from public.profiles
  const userIds = members.map(m => m.user_id);
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username, email, avatar_url')
    .in('id', userIds);

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
    // Return members with fallback profile info if profile fetch fails
    const fallback = members.map(member => ({
      role: member.role,
      user_id: member.user_id,
      profiles: { username: 'Unknown User', email: 'Unknown' },
      isOnline: isUserOnline(member.user_id)
    }));
    res.json(fallback);
    return;
  }

  // 3. Manually merge the profiles into the member records
  const combined = members.map(member => {
    const profile = profiles.find(p => p.id === member.user_id);
    return {
      role: member.role,
      user_id: member.user_id,
      profiles: profile || { username: 'Unknown User', email: 'Unknown' },
      isOnline: isUserOnline(member.user_id)
    };
  });

  res.json(combined);
});

// GET /rooms/discover - Fetch rooms the user is NOT a member of (PROTECTED)
router.get('/discover', verifyUser, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  // Get IDs of rooms the user is already in
  const { data: memberships } = await supabase
    .from('room_members')
    .select('room_id')
    .eq('user_id', userId);

  const joinedRoomIds = memberships?.map(m => m.room_id) || [];

  // Fetch rooms not in that list
  let query = supabase.from('rooms').select('*');
  
  if (joinedRoomIds.length > 0) {
    query = query.not('id', 'in', `(${joinedRoomIds.join(',')})`);
  }

  const { data: rooms, error } = await query.order('created_at', { ascending: true });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(rooms);
});

// GET /rooms - Fetch only rooms the user is a member of (PROTECTED)
router.get('/', verifyUser, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  // Fetch only rooms where the user has a membership record
  const { data: memberships, error } = await supabase
    .from('room_members')
    .select(`
      role,
      rooms (*)
    `)
    .eq('user_id', userId)
    .order('created_at', { referencedTable: 'rooms', ascending: true });

  if (error) {
      res.status(500).json({ error: error.message });
      return;
  }

  // Format the response to match the expected Room interface on the frontend
  const processedRooms = memberships.map((m: any) => ({
    ...m.rooms,
    isMember: true,
    role: m.role
  }));

  res.json(processedRooms);
});

// PATCH /rooms/:roomId - Update room details (OWNER ONLY)
router.patch('/:roomId', verifyUser, verifyRoomOwner, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;
  const { name } = req.body;
  const file = req.file;

  const updateData: any = {};
  if (name) {
    if (!validateRoomName(name)) {
      res.status(400).json({ error: "Room name must be 1-100 characters" });
      return;
    }
    updateData.name = name;
  }

  if (file) {
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `room_profiles/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('room_profiles')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from('room_profiles')
        .getPublicUrl(filePath);
      updateData.room_profile = publicUrl;
    }
  }

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "No update data provided" });
    return;
  }

  const { data, error } = await supabase
    .from('rooms')
    .update(updateData)
    .eq('id', roomId)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
});

// DELETE /rooms/:roomId/members/:targetUserId - Kick a member (OWNER ONLY)
router.delete('/:roomId/members/:targetUserId', verifyUser, verifyRoomOwner, async (req: AuthenticatedRequest, res: Response) => {
  const { roomId, targetUserId } = req.params;
  const ownerId = req.user?.id;

  if (targetUserId === ownerId) {
    res.status(400).json({ error: "Owners cannot kick themselves. Use the leave endpoint if you want to leave (requires ownership transfer first if implemented)" });
    return;
  }

  const { error } = await supabase
    .from('room_members')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', targetUserId);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json({ message: "Member removed successfully" });
});

// POST /rooms/:roomId/members - Add a member by email (OWNER ONLY)
router.post('/:roomId/members', verifyUser, verifyRoomOwner, async (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: "User email is required" });
    return;
  }

  // Look up user by email in profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (profileError || !profile) {
    res.status(404).json({ error: "User with this email not found" });
    return;
  }

  // Check if already a member
  const { data: existingMember } = await supabase
    .from('room_members')
    .select('*')
    .eq('room_id', roomId)
    .eq('user_id', profile.id)
    .single();

  if (existingMember) {
    res.status(400).json({ error: "User is already a member of this room" });
    return;
  }

  const { error } = await supabase
    .from('room_members')
    .insert([{ 
      room_id: roomId, 
      user_id: profile.id,
      role: 'member' 
    }]);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json({ message: "Member added successfully" });
});

// DELETE /rooms/:roomId/leave - Leave a room (MEMBER ONLY)
router.delete('/:roomId/leave', verifyUser, verifyRoomMember, async (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;
  const userId = req.user?.id;
  const role = (req as any).roomRole;

  if (role === 'owner') {
    res.status(400).json({ error: "Owners cannot leave their own room. This prototype does not support ownership transfer or room deletion yet." });
    return;
  }

  const { error } = await supabase
    .from('room_members')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', userId);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json({ message: "Successfully left the room" });
});

// DELETE /rooms/:roomId - Delete a room (OWNER ONLY)
router.delete('/:roomId', verifyUser, verifyRoomOwner, async (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;

  // 1. Manually delete all room members first (due to ON DELETE NO ACTION constraint)
  const { error: membersError } = await supabase
    .from('room_members')
    .delete()
    .eq('room_id', roomId);

  if (membersError) {
    res.status(500).json({ error: "Failed to delete room members: " + membersError.message });
    return;
  }

  // 2. Delete the room itself (channels and messages will CASCADE)
  const { error: roomError } = await supabase
    .from('rooms')
    .delete()
    .eq('id', roomId);

  if (roomError) {
    res.status(500).json({ error: "Failed to delete room: " + roomError.message });
    return;
  }

  // 3. Emit real-time event to clients
  const io = req.app.get('io');
  if (io) {
    io.to(roomId).emit('room_deleted', roomId);
  }

  res.status(200).json({ message: "Room deleted successfully" });
});

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
    .upsert([{ requester_id: requesterId, addressee_id: addresseeId, status: 'pending' }]);

  if (error) {
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
