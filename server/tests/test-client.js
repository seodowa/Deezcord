const { io } = require("socket.io-client");
const supabase = require('../config/supabaseClient');
const signIn = require("../utils/auth");


async function main() {
  try {
    const token = await signIn(process.env.email, process.env.password);

    const socket = io("http://localhost:3001", {
      auth: { token }
    });

    const { data: roomData, error: roomError } = await supabase
    .from("rooms")
    .select("id")
    .eq("name", "test")
    .single();
    
    if (roomError) throw roomError;
    const TEST_ROOM = roomData.id;

    socket.on("connect", () => {
      console.log(`[+] Connected to server with ID: ${socket.id}`);
        
      // 1. Join the room
      socket.emit("join_room", TEST_ROOM);
      console.log(`[+] Emitted join_room for: ${TEST_ROOM}`);
      
      // 2. Send a test message after a short delay
      setTimeout(() => {
        const messagePayload = {
          room_id: TEST_ROOM,
          username: "authenticated_terminal_tester",
          content: "Hello from the command line!"
        };
        socket.emit("send_message", messagePayload);
        console.log("[+] Emitted send_message:", messagePayload.content);
      }, 1000);
    });

    // 3. Listen for incoming messages
    socket.on("receive_message", (data) => {
      console.log("[!] Broadcast received:", data);
      socket.disconnect();
    });

    socket.on("disconnect", () => {
      console.log("[-] Disconnected from server");

    });

  } catch (error) {
    console.error("Authentication failed:", error.message);
    process.exit(1);
  }
}


main();