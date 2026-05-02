import dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import { Server, Socket } from 'socket.io';

// 1. Import our separated modules
import supabase from './config/supabaseClient';
import roomRoutes from './routes/roomRoutes';
import healthRoutes from './routes/healthRoutes';
import authRoutes from './routes/authRoutes';
import { ReceiveMessagePayload } from './types/socket';
import { addUser, removeUser } from './utils/presence';

const app = express();
app.use(cors());
app.use(express.json());

// 2. Tell Express to use the routes we separated
app.use('/auth', authRoutes);
app.use('/health', healthRoutes);
app.use('/rooms', roomRoutes);

// Redirect root to /rooms
app.get('/', (req: Request, res: Response) => {
  res.redirect('/rooms');
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"],
  },
});

// Create custom socket interface extending standard Socket
interface AuthenticatedSocket extends Socket {
  user?: any;
}

// 3. Socket.io Authentication Middleware (The Bouncer)
io.use(async (socket: AuthenticatedSocket, next) => {
  try {
    // The frontend must pass the token when initializing the socket connection
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Unauthorized: No token provided"));
    }

    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return next(new Error("Unauthorized: Invalid token"));
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
  }

  // We now know exactly who this is!
  console.log(`Verified User Connected: ${socket.user?.email} (Socket ID: ${socket.id})`);

  socket.on('join_room', async (room_id: any) => {
    try {
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
    } catch (error) {
      console.error("Error joining room:", error);
    }
    
  });

  socket.on('leave_room', (room_id: any) => {
    if (typeof room_id === 'string') {
      socket.leave(room_id);
      console.log(`User ${socket.user?.email} left room: ${room_id}`);
    }
  });

  socket.on('send_message', async (data: any) => {
    try {
      const email = socket.user?.email;
      const userId = socket.user?.id;
      const senderName = email ? email.split('@')[0] : "Unknown User"; 

      // type check for data.room_id
      if (typeof data.room_id !== 'string' || typeof data.content !== 'string') {
        throw new Error("Invalid room_id or content: Must be of type string");
      }

      // Fetch user profile to get avatar
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', userId)
        .single();

      const { data: insertedData, error } = await supabase
        .from('messages')
        .insert([{ 
          room_id: data.room_id, 
          user_id: userId, // Persistent UUID
          username: profile?.username || senderName, // Still store username for legacy/snapshot purposes
          content: data.content 
        }])
        .select()
        .single();

      if (error) throw error;

      // Broadcast the message to EVERYONE in the room including the sender
      const broadcastData: ReceiveMessagePayload = {
          id: insertedData.id,
          user_id: userId,
          room_id: data.room_id,
          content: data.content,
          username: profile?.username || senderName,
          created_at: insertedData.created_at,
          avatar_url: profile?.avatar_url
      };

      io.to(data.room_id).emit('receive_message', broadcastData);
    } catch (error) {
      console.error("Error sending message:", error);
    }
    
  });

  socket.on('typing_start', (room_id: string) => {
    const username = socket.user?.email?.split('@')[0] || "Unknown User";
    socket.to(room_id).emit('user_typing', { room_id, userId, username, isTyping: true });
  });

  socket.on('typing_stop', (room_id: string) => {
    const username = socket.user?.email?.split('@')[0] || "Unknown User";
    socket.to(room_id).emit('user_typing', { room_id, userId, username, isTyping: false });
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