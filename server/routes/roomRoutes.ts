import express, { Response } from 'express';
import supabase from '../config/supabaseClient';
import { verifyUser, verifyRoomMember, AuthenticatedRequest } from '../middleware/authMiddleware';

const router = express.Router();

// Add input validation helper
const validateRoomName = (name: any): boolean => {
  if (typeof name !== 'string') return false;
  if (name.trim().length === 0) return false;
  if (name.length > 100) return false;
  return true;
};

// server/routes/roomRoutes.ts

router.get('/:roomId/messages', verifyUser, verifyRoomMember, async (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;
  
  // 1. Get pagination parameters from query string (e.g., ?page=0&limit=50)
  const page = parseInt(req.query.page as string) || 0;
  const limit = parseInt(req.query.limit as string) || 50;

  // 2. Calculate the range
  const from = page * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from('messages')
    .select('*', { count: 'exact' }) // 'exact' returns total count of messages
    .eq('room_id', roomId)
    .order('created_at', { ascending: false }) // Get newest messages first for chat
    .range(from, to);

  if (error) {
      res.status(500).json({ error: error.message });
      return;
  }

  // 3. Return data along with metadata so the frontend knows if there's more to load
  res.json({
    messages: data.reverse(), // Reverse back to chronological order for the UI
    nextPage: data.length === limit ? page + 1 : null,
    totalCount: count
  });
});

// POST /rooms - Create a new chat room (PROTECTED)
router.post('/', verifyUser, async (req: AuthenticatedRequest, res: Response) => {
  const { name } = req.body;
  const userId = req.user?.id;

  if (!name) {
    res.status(400).json({ error: "Room name is required" });
    return;
  } else if (!validateRoomName(name)) {
    res.status(400).json({ error: "Room name must be 1-100 characters" });
    return;
  }

  // Use a transaction-like approach (though Supabase doesn't support them easily via JS, we can do sequential)
  const { data: roomData, error: roomError } = await supabase
    .from('rooms')
    .insert([{ name: name }])
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