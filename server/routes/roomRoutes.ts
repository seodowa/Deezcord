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

// POST /rooms/create - Create a new chat room (PROTECTED)
router.post('/', verifyUser, async (req: AuthenticatedRequest, res: Response) => {
  const { name } = req.body;

  if (!name) {
    res.status(400).json({ error: "Room name is required" });
    return;
  } else if (!validateRoomName(name)) {
    res.status(400).json({ error: "Room name must be 1-100 characters" });
    return;
  }

  const { data, error } = await supabase
    .from('rooms')
    .insert([{ name: name }])
    .select(); // .select() ensures Supabase returns the newly created row (including its new UUID)

  if (error) {
    // If the room name already exists (since we set it to UNIQUE in the schema)
    if (error.code === '23505') {
      res.status(409).json({ error: "A room with this name already exists" });
      return;
    }
    res.status(500).json({ error: error.message });
    return;
  }

  // Return the newly created room so the frontend can immediately route the user to it
  res.status(201).json(data && data.length > 0 ? data[0] : null); 
});

// GET /rooms - Fetch all available rooms for the sidebar (PROTECTED)
router.get('/', verifyUser, async (req: AuthenticatedRequest, res: Response) => {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
      res.status(500).json({ error: error.message });
      return;
  }
  res.json(data);
});

export default router;