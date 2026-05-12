import express, { Response } from 'express';
import multer from 'multer';
import supabase from '../config/supabaseClient';
import { verifyUser, verifyRoomMember, verifyRoomOwner, verifyAAL2, verifyTransactionalMfa, AuthenticatedRequest } from '../middleware/authMiddleware';
import { isUserOnline } from '../utils/presence';
import channelRoutes from './channelRoutes';

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

// Mount channel routes
router.use('/:roomId/channels', channelRoutes);

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

  // Fetch rooms not in that list, and not DMs
  let query = supabase.from('rooms').select('*').eq('is_dm', false);
  
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

  // Fetch only rooms where the user has a membership record, excluding DMs
  const { data: memberships, error } = await supabase
    .from('room_members')
    .select(`
      role,
      rooms!inner (*)
    `)
    .eq('user_id', userId)
    .eq('rooms.is_dm', false)
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
router.delete('/:roomId', verifyUser, verifyRoomOwner, verifyTransactionalMfa, async (req: AuthenticatedRequest, res: Response) => {
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

export default router;
