import { io } from "socket.io-client";
import supabase from '../config/supabaseClient';
import signIn from "../utils/auth";
import readline from 'readline';
import { SendMessagePayload, ReceiveMessagePayload } from '../types/socket';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

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
        
      // Join the room
      socket.emit("join_room", TEST_ROOM);
      console.log(`[+] Joined room: ${TEST_ROOM}`);
      console.log(`[!] Type your message and press Enter to send. Type /exit to quit.\n`);

      // Set a prompt indicator for the user
      rl.setPrompt('> ');
      rl.prompt();

      rl.on('line', (input: string) => {
        const message = input.trim();

        if (message.toLowerCase() === "/exit") {
          console.log("Exiting...");
          rl.close();
          process.exit(0);
        }

        if (message) {
          const payload: SendMessagePayload = {
            room_id: TEST_ROOM,
            content: message
          };
          socket.emit("send_message", payload);
        }
        
        // Reprompt after they hit enter
        rl.prompt();
      });
    });

    // Listen for incoming messages
    socket.on("receive_message", (data: ReceiveMessagePayload) => {
      // Clear the current line so incoming text doesn't mess up what the user is currently typing
      process.stdout.write('\r\x1b[K');
      
      console.log(`[${data.username}]: ${data.content}`);
      
      // Force the prompt to show up again below the new message
      rl.prompt(true);
    });

    socket.on("disconnect", () => {
      console.log("\n[-] Disconnected from server");
      process.exit(0);
    });

  } catch (error: any) {
    console.error("Authentication failed:", error.message);
    process.exit(1);
  }
}

main();