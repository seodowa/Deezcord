require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

// 1. Import our separated modules
const supabase = require('./config/supabaseClient');
const roomRoutes = require('./routes/roomRoutes');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// 2. Tell Express to use the routes we separated
app.use('/auth', authRoutes);
app.use('/health', healthRoutes);
app.use('/rooms', roomRoutes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", 
    methods: ["GET", "POST"],
  },
});

// 3. Socket.io Authentication Middleware (The Bouncer)
io.use(async (socket, next) => {
  // The frontend must pass the token when initializing the socket connection
  const token = socket.handshake.auth.token;

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
});


// 4. Socket logic stays here (now fully protected)
io.on('connection', (socket) => {
  // We now know exactly who this is!
  console.log(`Verified User Connected: ${socket.user.email} (Socket ID: ${socket.id})`);

  socket.on('join_room', (room_id) => {
    socket.join(room_id);
    console.log(`User ${socket.user.email} joined room: ${room_id}`);
  });

  socket.on('send_message', async (data) => {
    // Security Upgrade: We ignore data.username from the frontend.
    // Instead, we force the username to be the verified email from the token!
    const senderName = socket.user.email.split('@')[0]; // Quick trick to get a username from an email

    const { error } = await supabase
      .from('messages')
      .insert([{ 
        room_id: data.room_id, 
        username: senderName, // Securely assigned
        content: data.content 
      }]);

    if (error) {
      console.error("Error saving message:", error);
      return;
    }

    // Broadcast the message with the verified sender name attached
    const broadcastData = {
        ...data,
        username: senderName 
    };

    socket.to(data.room_id).emit('receive_message', broadcastData);
  });

  socket.on('disconnect', () => {
    console.log(`User Disconnected: ${socket.user.email}`);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`[Deezcord Backend] Server running on port ${PORT}`);
});