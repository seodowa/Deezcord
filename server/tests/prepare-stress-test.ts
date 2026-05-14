import dotenv from 'dotenv';
dotenv.config();
import signIn from "../utils/auth";
import supabase from '../config/supabaseClient';

async function main() {
  const email = process.env.EMAIL;
  const password = process.env.PASSWORD;

  if (!email || !password) {
    console.error("Error: TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables are required.");
    process.exit(1);
  }

  try {
    const { token } = await signIn(email, password, 'test-device-id');
    
    // Get a room and channel to test with
    const { data: room } = await supabase.from('rooms').select('id').limit(1).single();
    if (!room) throw new Error("No rooms found in database");

    const { data: channel } = await supabase.from('channels').select('id').eq('room_id', room.id).limit(1).single();
    if (!channel) throw new Error("No channels found for room " + room.id);

    console.log("\n--- Stress Test Configuration ---");
    console.log(`Token: ${token}`);
    console.log(`Room ID: ${room.id}`);
    console.log(`Channel ID: ${channel.id}`);
    console.log("\n--- Run this command to start locust test ---");
    console.log(`TOKEN=${token}\nDEVICE_ID=test-device-id\nROOM_ID=${room.id}\nCHANNEL_ID=${channel.id}\nBASE_URL=http://localhost:3001`);
    
  } catch (error: any) {
    console.error("Failed to prepare test context:", error.message);
  }
}

main();
