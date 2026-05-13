import dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import { Server, Socket } from 'socket.io';
import msgpackParser from "socket.io-msgpack-parser";

// 1. Import our separated modules
import supabase from './config/supabaseClient';
import roomRoutes from './routes/roomRoutes';
import friendRoutes from './routes/friendRoutes';
import userRoutes from './routes/userRoutes';
import healthRoutes from './routes/healthRoutes';
import authRoutes from './routes/authRoutes';
import dmRoutes from './routes/dmRoutes';
import { ReceiveMessagePayload } from './types/socket';
import { addUser, removeUser } from './utils/presence';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Determine if we are running from the compiled 'dist' folder or the root 'server' folder
const clientDistPath = __dirname.endsWith('dist') 
  ? path.join(__dirname, '../../client/dist') 
  : path.join(__dirname, '../client/dist');

app.use(express.static(clientDistPath));

// 2. Tell Express to use the routes we separated
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/dms', dmRoutes);

// Redirect root to /rooms
app.get('/api', (req: Request, res: Response) => {
  res.redirect('/api/rooms');
});

app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"],
  },
  parser: msgpackParser
});

// Make io accessible to our routers
app.set('io', io);

// Create custom socket interface extending standard Socket
interface AuthenticatedSocket extends Socket {
  user?: any;
}

// 3. Socket.io Authentication Middleware (The Bouncer)
io.use(async (socket: AuthenticatedSocket, next) => {
  try {
    // The frontend must pass the token when initializing the socket connection
    const token = socket.handshake.auth?.token;
    const deviceId = socket.handshake.auth?.deviceId;

    if (!token) {
      return next(new Error("Unauthorized: No token provided"));
    }

    if (!deviceId) {
      return next(new Error("Unauthorized: No device ID provided"));
    }

    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return next(new Error("Unauthorized: Invalid token"));
    }

    // Fingerprint Check
    const registeredDevices = user.app_metadata?.devices || [];
    if (!registeredDevices.includes(deviceId)) {
      return next(new Error("Unauthorized: Device not recognized"));
    }

    // Attach the verified user object to the socket for future use
    socket.user = user;
    next(); // Allow the connection to proceed
  } catch (error) {
    console.error("Socket Authentication Error:", error);
    next(new Error("Internal Server Error"));
  }
  
});


// 4. Socket logic stays here (now fully protected)
io.on('connection', (socket: AuthenticatedSocket) => {
  const userId = socket.user?.id;
  
  if (userId) {
    const isFirstConnection = addUser(userId);
    if (isFirstConnection) {
      io.emit('presence_update', { userId, status: 'online' });
    }
    // Join a personal room to receive direct events (like friend requests)
    socket.join(userId);
  }

  // We now know exactly who this is!
  console.log(`Verified User Connected: ${socket.user?.email} (Socket ID: ${socket.id})`);

  socket.on('join_room', async (data: any) => {
    try {
      // support legacy room string or new object { room_id, channel_id }
      const room_id = typeof data === 'string' ? data : data?.room_id;
      const channel_id = typeof data === 'object' ? data?.channel_id : null;

      // check if room_id is a string
      if (typeof room_id !== 'string') {
        throw new Error("Invalid room_id: Must be of type string");
      }

      // check if room exists in the database
      const { data: room, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', room_id)
        .single();
      
      if (error || !room) {
        throw new Error("Room not found");
      }

      socket.join(room_id);
      console.log(`User ${socket.user?.email} joined room: ${room_id}`);

      if (channel_id && typeof channel_id === 'string') {
        socket.join(`channel:${channel_id}`);
        console.log(`User ${socket.user?.email} joined channel: ${channel_id}`);
      }
    } catch (error) {
      console.error("Error joining room/channel:", error);
    }
    
  });

  socket.on('leave_room', (data: any) => {
    const room_id = typeof data === 'string' ? data : data?.room_id;
    const channel_id = typeof data === 'object' ? data?.channel_id : null;

    if (typeof room_id === 'string') {
      socket.leave(room_id);
      console.log(`User ${socket.user?.email} left room: ${room_id}`);
    }

    if (typeof channel_id === 'string') {
      socket.leave(`channel:${channel_id}`);
      console.log(`User ${socket.user?.email} left channel: ${channel_id}`);
    }
  });

  socket.on('send_message', async (data: any) => {
    try {
      const email = socket.user?.email;
      const userId = socket.user?.id;
      const senderName = email ? email.split('@')[0] : "Unknown User"; 

      // type check for data.room_id
      if (typeof data.room_id !== 'string' || typeof data.content !== 'string' || typeof data.channel_id !== 'string') {
        throw new Error("Invalid payload: Must be strings");
      }

      // Fetch user profile to get avatar
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', userId)
        .single();

      // Fetch parent message if exists for broadcasting
      let parentMessage = null;
      if (data.parent_id) {
        const { data: parent } = await supabase
          .from('messages')
          .select('username, content')
          .eq('id', data.parent_id)
          .single();
        if (parent) {
          parentMessage = {
            username: parent.username,
            content: parent.content
          };
        }
      }

      const { data: insertedData, error } = await supabase
        .from('messages')
        .insert([{ 
          room_id: data.room_id,
          channel_id: data.channel_id,
          user_id: userId, // Persistent UUID
          username: profile?.username || senderName, // Still store username for legacy/snapshot purposes
          content: data.content,
          file_url: data.file_url, // Store optional file URL
          file_name: data.file_name, // Store optional file name
          file_width: data.file_width, // Store optional image width
          file_height: data.file_height, // Store optional image height
          parent_id: data.parent_id // Store parent_id for replies
        }])
        .select()
        .single();

      if (error) throw error;

      // Broadcast the message to EVERYONE in the channel including the sender
      const broadcastData: ReceiveMessagePayload = {
          id: insertedData.id,
          user_id: userId,
          room_id: data.room_id,
          channel_id: data.channel_id,
          content: data.content,
          username: profile?.username || senderName,
          created_at: insertedData.created_at,
          avatar_url: profile?.avatar_url,
          file_url: data.file_url,
          file_name: data.file_name,
          file_width: data.file_width,
          file_height: data.file_height,
          parent_id: data.parent_id,
          parent_message: parentMessage,
          temp_id: data.temp_id
      };

      io.to(`channel:${data.channel_id}`).emit('receive_message', broadcastData);
    } catch (error) {
      console.error("Error sending message:", error);
    }
    
  });

  socket.on('unsend_message', async (data: { message_id: string; channel_id: string }) => {
    try {
      const userId = socket.user?.id;
      if (!userId || !data.message_id || !data.channel_id) return;

      // Security Check: Only allow the sender to delete the message
      const { data: message, error: fetchError } = await supabase
        .from('messages')
        .select('user_id, file_url, file_name')
        .eq('id', data.message_id)
        .single();

      if (fetchError || !message) {
        console.error("Message not found or error fetching message:", fetchError);
        return;
      }

      if (message.user_id !== userId) {
        console.warn(`User ${userId} attempted to delete message ${data.message_id} owned by ${message.user_id}`);
        return;
      }

      // 1. Delete associated file if it exists
      if (message.file_url) {
        try {
          const urlParts = message.file_url.split('/message_attachments/');
          if (urlParts.length > 1) {
            const filePath = urlParts[1];
            await supabase.storage.from('message_attachments').remove([filePath]);
          }
        } catch (fileError) {
          console.error("Error deleting file attachment:", fileError);
        }
      }

      // 2. Delete associated reactions first (due to ON DELETE NO ACTION constraint)
      await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', data.message_id);

      // 3. Delete the message from database
      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .eq('id', data.message_id);

      if (deleteError) throw deleteError;

      // Broadcast deletion to everyone in the channel
      io.to(`channel:${data.channel_id}`).emit('message_deleted', {
        message_id: data.message_id,
        channel_id: data.channel_id
      });
      
      console.log(`User ${socket.user?.email} unsent message: ${data.message_id}`);
    } catch (error) {
      console.error("Error unsending message:", error);
    }
  });

  socket.on('add_reaction', async (data: any) => {
    try {
      const userId = socket.user?.id;
      if (!userId || !data.message_id || !data.emoji || !data.channel_id) return;

      // Fetch user profile to get username
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();

      // Insert reaction and fetch the inserted row
      const { data: insertedReaction, error } = await supabase
        .from('message_reactions')
        .insert([{
          message_id: data.message_id,
          user_id: userId,
          emoji: data.emoji
        }])
        .select()
        .single();

      if (error && error.code !== '23505') throw error; // Ignore unique constraint violation (already reacted)
      
      if (insertedReaction) {
        io.to(`channel:${data.channel_id}`).emit('reaction_added', {
          message_id: data.message_id,
          reaction: {
            id: insertedReaction.id,
            message_id: data.message_id,
            user_id: userId,
            emoji: data.emoji,
            username: profile?.username
          }
        });
      }
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
  });

  socket.on('remove_reaction', async (data: any) => {
    try {
      const userId = socket.user?.id;
      if (!userId || !data.message_id || !data.emoji || !data.channel_id) return;

      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', data.message_id)
        .eq('user_id', userId)
        .eq('emoji', data.emoji);

      if (error) throw error;

      io.to(`channel:${data.channel_id}`).emit('reaction_removed', {
        message_id: data.message_id,
        user_id: userId,
        emoji: data.emoji
      });
    } catch (error) {
      console.error("Error removing reaction:", error);
    }
  });

  socket.on('typing_start', (data: any) => {
    const room_id = typeof data === 'string' ? data : data?.room_id;
    const channel_id = typeof data === 'object' ? data?.channel_id : null;
    const target = channel_id ? `channel:${channel_id}` : room_id;
    const username = socket.user?.email?.split('@')[0] || "Unknown User";
    socket.to(target).emit('user_typing', { room_id, channel_id, userId, username, isTyping: true });
  });

  socket.on('typing_stop', (data: any) => {
    const room_id = typeof data === 'string' ? data : data?.room_id;
    const channel_id = typeof data === 'object' ? data?.channel_id : null;
    const target = channel_id ? `channel:${channel_id}` : room_id;
    const username = socket.user?.email?.split('@')[0] || "Unknown User";
    socket.to(target).emit('user_typing', { room_id, channel_id, userId, username, isTyping: false });
  });

  socket.on('disconnect', () => {
    if (userId) {
      const isLastDisconnect = removeUser(userId);
      if (isLastDisconnect) {
        io.emit('presence_update', { userId, status: 'offline' });
      }
    }
    console.log(`User Disconnected: ${socket.user?.email}`);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`[Deezcord Backend] Server running on port ${PORT}`);
});
