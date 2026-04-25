import express, { Response } from 'express';
import supabase from '../config/supabaseClient';
import verifyUser, { AuthenticatedRequest } from '../middleware/authMiddleware';

const router = express.Router();

// Add input validation helper
const validateRoomName = (name: any): boolean => {
  if (typeof name !== 'string') return false;
  if (name.trim().length === 0) return false;
  if (name.length > 100) return false;
  return true;
};

// GET /rooms/:roomId/messages - Fetch message history (PROTECTED)
router.get('/:roomId/messages', verifyUser, async (req: AuthenticatedRequest, res: Response) => {
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