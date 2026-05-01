import express, { Response } from 'express';
import multer from 'multer';
import supabase from '../config/supabaseClient';
import { verifyUser, verifyRoomMember, AuthenticatedRequest } from '../middleware/authMiddleware';

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

// GET /rooms/:roomId/messages - Fetch message history for a room (PROTECTED)
router.get('/:roomId/messages', verifyUser, verifyRoomMember, async (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
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
    const filePath = `room_profiles/${fileName}`;

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

  const { data, error } = await supabase
    .from('room_members')
    .select(`
      role,
      user_id,
      profiles:user_id (
        username,
        email
      )
    `)
    .eq('room_id', roomId);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
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

export default router;