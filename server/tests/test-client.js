const { io } = require("socket.io-client");

// Connect to your running backend
const socket = io("http://localhost:3001");

const TEST_ROOM = "1e325f0a-63db-4724-af77-ea3a4445aadd"; // Use a valid UUID from your Supabase 'rooms' table

socket.on("connect", () => {
  console.log(`[+] Connected to server with ID: ${socket.id}`);
    
  // 1. Join the room
  socket.emit("join_room", TEST_ROOM);
  console.log(`[+] Emitted join_room for: ${TEST_ROOM}`);
  
  // 2. Send a test message after a short delay
  setTimeout(() => {
    const messagePayload = {
      room_id: TEST_ROOM,
      username: "terminal_tester",
      content: "Hello from the command line!"
    };
    socket.emit("send_message", messagePayload);
    console.log("[+] Emitted send_message:", messagePayload.content);
  }, 1000);
});

// 3. Listen for incoming messages
socket.on("receive_message", (data) => {
  console.log("[!] Broadcast received:", data);
});

socket.on("disconnect", () => {
  console.log("[-] Disconnected from server");
});