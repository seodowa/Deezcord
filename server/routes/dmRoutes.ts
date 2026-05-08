import express, { Response } from 'express';
import supabase from '../config/supabaseClient';
import { verifyUser, AuthenticatedRequest } from '../middleware/authMiddleware';
import { isUserOnline } from '../utils/presence';

const router = express.Router();

// GET /api/dms - Fetch all DMs the user is a member of
router.get('/', verifyUser, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  // 1. Fetch room memberships for this user where the room is a DM
  const { data: memberships, error } = await supabase
    .from('room_members')
    .select(`
      role,
      rooms!inner (
        id,
        name,
        created_at,
        is_dm,
        room_profile
      )
    `)
    .eq('user_id', userId)
    .eq('rooms.is_dm', true)
    .order('created_at', { referencedTable: 'rooms', ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  if (!memberships || memberships.length === 0) {
    res.json([]);
    return;
  }

  const roomIds = memberships.map((m: any) => m.rooms.id);

  // 2. We need to find the *other* user in these DMs to use as the "target user" for UI purposes
  // Let's fetch all members of these DMs
  const { data: allMembers, error: membersError } = await supabase
    .from('room_members')
    .select('room_id, user_id')
    .in('room_id', roomIds)
    .neq('user_id', userId); // Exclude the current user

  if (membersError) {
    res.status(500).json({ error: membersError.message });
    return;
  }

  // Extract the target user IDs
  const targetUserIds = allMembers?.map(m => m.user_id) || [];

  // 3. Fetch profiles for the target users
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username, email, avatar_url')
    .in('id', targetUserIds);

  if (profilesError) {
    res.status(500).json({ error: profilesError.message });
    return;
  }

  // 4. Also fetch the default channel for each DM room
  const { data: channels, error: channelsError } = await supabase
    .from('channels')
    .select('id, room_id, name')
    .in('room_id', roomIds);

  if (channelsError) {
    res.status(500).json({ error: channelsError.message });
    return;
  }

  const channelIds = channels?.map(c => c.id) || [];

  // 5. Fetch the latest message timestamp and message count for each channel
  // This allows us to filter out empty DMs and sort by activity
  const { data: messageStats, error: statsError } = await supabase
    .from('messages')
    .select('channel_id, created_at')
    .in('channel_id', channelIds)
    .order('created_at', { ascending: false });

  if (statsError) {
    res.status(500).json({ error: statsError.message });
    return;
  }

  // 6. Combine the data and filter out empty DMs
  const processedRooms = memberships
    .map((m: any) => {
      const room = m.rooms;
      const targetMember = allMembers?.find(member => member.room_id === room.id);
      const targetProfile = targetMember ? profiles?.find(p => p.id === targetMember.user_id) : null;
      const channel = channels?.find(c => c.room_id === room.id);
      
      // Find latest message for this channel
      const latestMessage = messageStats?.find(ms => ms.channel_id === channel?.id);

      return {
        ...room,
        isMember: true,
        role: m.role,
        targetUser: targetProfile ? {
          ...targetProfile,
          isOnline: isUserOnline(targetProfile.id)
        } : null,
        defaultChannelId: channel?.id,
        last_message_at: latestMessage?.created_at || null
      };
    })
    .filter(room => room.last_message_at !== null) // Only show DMs with messages
    .sort((a, b) => {
      // Sort by latest message timestamp (Most Recent First)
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    });

  res.json(processedRooms);
});

// POST /api/dms/:targetUserId - Get or create a DM with a user
router.post('/:targetUserId', verifyUser, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const targetUserId = req.params.targetUserId as string;

  if (userId === targetUserId) {
    res.status(400).json({ error: "Cannot create a DM with yourself" });
    return;
  }

  // 1. Check if a DM already exists between these two users
  // We can query room_members to find a room where BOTH users are members AND it's a DM
  const { data: myMemberships, error: checkError1 } = await supabase
    .from('room_members')
    .select('room_id')
    .eq('user_id', userId);

  if (checkError1) {
    res.status(500).json({ error: checkError1.message });
    return;
  }

  const myRoomIds = myMemberships?.map(m => m.room_id) || [];

  if (myRoomIds.length > 0) {
    const { data: sharedRooms, error: checkError2 } = await supabase
      .from('room_members')
      .select(`
        room_id,
        rooms!inner(is_dm)
      `)
      .in('room_id', myRoomIds)
      .eq('user_id', targetUserId)
      .eq('rooms.is_dm', true);

    if (checkError2) {
      res.status(500).json({ error: checkError2.message });
      return;
    }

    if (sharedRooms && sharedRooms.length > 0) {
      // DM already exists, return the room info
      const existingRoomId = sharedRooms[0].room_id;
      
      // Fetch room details
      const { data: existingRoom, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', existingRoomId)
        .single();
        
      if (fetchError) {
        res.status(500).json({ error: fetchError.message });
        return;
      }
      
      // Fetch channel
      const { data: channelData } = await supabase
        .from('channels')
        .select('id')
        .eq('room_id', existingRoomId)
        .single();
        
      res.json({ ...existingRoom, defaultChannelId: channelData?.id });
      return;
    }
  }

  // 2. DM doesn't exist, create a new one
  
  // Get target user profile for naming (optional, but good for logs/debugging)
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', targetUserId)
    .single();

  const dmName = `DM-${userId.substring(0,8)}-${targetUserId.substring(0,8)}`;

  // Create the room
  const { data: roomData, error: roomError } = await supabase
    .from('rooms')
    .insert([{ 
      name: dmName,
      is_dm: true
    }])
    .select()
    .single();

  if (roomError) {
    res.status(500).json({ error: roomError.message });
    return;
  }

  // Add members
  const { error: membersError } = await supabase
    .from('room_members')
    .insert([
      { room_id: roomData.id, user_id: userId, role: 'member' },
      { room_id: roomData.id, user_id: targetUserId, role: 'member' }
    ]);

  if (membersError) {
    // Attempt cleanup
    await supabase.from('rooms').delete().eq('id', roomData.id);
    res.status(500).json({ error: "Failed to add members: " + membersError.message });
    return;
  }

  // Create default channel
  const { data: channelData, error: channelError } = await supabase
    .from('channels')
    .insert([{
      room_id: roomData.id,
      name: 'chat',
      type: 'text'
    }])
    .select()
    .single();

  if (channelError) {
    res.status(500).json({ error: "Failed to create channel: " + channelError.message });
    return;
  }

  // Notify the other user via Socket.IO if they are online
  const io = req.app.get('io');
  if (io) {
    // Send to personal room to alert them
    io.to(targetUserId).emit('dm_created', { 
        room_id: roomData.id,
        channel_id: channelData.id,
        targetUserId: userId // To them, we are the target
    });
  }

  res.status(201).json({ ...roomData, defaultChannelId: channelData.id });
});

export default router;
