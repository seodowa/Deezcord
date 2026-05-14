import express, { Response } from 'express';
import multer from 'multer';
import supabase from '../config/supabaseClient';
import { verifyUser, verifyRoomMember, verifyRoomOwner, AuthenticatedRequest } from '../middleware/authMiddleware';

const router = express.Router({ mergeParams: true });

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// GET / - Fetch channels for a room
router.get('/', verifyUser, verifyRoomMember, async (req: AuthenticatedRequest, res: Response) => {
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

// POST / - Create a new channel (OWNER ONLY)
router.post('/', verifyUser, verifyRoomOwner, async (req: AuthenticatedRequest, res: Response) => {
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

// GET /:channelId/messages - Fetch message history for a channel (PROTECTED)
router.get('/:channelId/messages', verifyUser, verifyRoomMember, async (req: AuthenticatedRequest, res: Response) => {
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

// POST /:channelId/messages/upload - Upload a file for a message (PROTECTED)
router.post('/:channelId/messages/upload', verifyUser, verifyRoomMember, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
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

// DELETE /:channelId - Delete a channel (OWNER ONLY)
router.delete('/:channelId', verifyUser, verifyRoomOwner, async (req: AuthenticatedRequest, res: Response) => {
  const { roomId, channelId } = req.params;

  try {
    // 1. Verify that the channel belongs to the room and exists
    const { data: channel, error: findError } = await supabase
      .from('channels')
      .select('id, name')
      .eq('id', channelId)
      .eq('room_id', roomId)
      .single();

    if (findError || !channel) {
      res.status(404).json({ error: "Channel not found in this room" });
      return;
    }

    // 2. Prevent deleting the last channel in a room (Requirement: rooms must have at least one channel)
    const { count, error: countError } = await supabase
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId);

    if (countError) throw countError;

    if (count !== null && count <= 1) {
      res.status(400).json({ error: "Cannot delete the last channel in a room. A room must have at least one channel." });
      return;
    }

    // 3. Delete the channel (Associated messages will CASCADE)
    const { error: deleteError } = await supabase
      .from('channels')
      .delete()
      .eq('id', channelId);

    if (deleteError) throw deleteError;

    // 4. Notify clients via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('channel_deleted', { roomId, channelId });
    }

    res.status(200).json({ message: `Channel '#${channel.name}' deleted successfully` });
  } catch (error: any) {
    console.error('Channel deletion error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete channel' });
  }
});

export default router;