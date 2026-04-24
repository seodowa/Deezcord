const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseClient'); // Import the DB

// GET /rooms/:roomId/messages - Fetch message history
router.get('/:roomId/messages', async (req, res) => {
  const { roomId } = req.params;
  
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /rooms/create - Create a new chat room
router.post('/create', async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Room name is required" });
  }

  const { data, error } = await supabase
    .from('rooms')
    .insert([{ name: name }])
    .select(); // .select() ensures Supabase returns the newly created row (including its new UUID)

  if (error) {
    // If the room name already exists (since we set it to UNIQUE in the schema)
    if (error.code === '23505') {
      return res.status(409).json({ error: "A room with this name already exists" });
    }
    return res.status(500).json({ error: error.message });
  }

  // Return the newly created room so the frontend can immediately route the user to it
  res.status(201).json(data[0]); 
});

// GET /rooms - Fetch all available rooms for the sidebar
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;