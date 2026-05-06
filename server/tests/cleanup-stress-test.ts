import dotenv from 'dotenv';
dotenv.config();
import supabase from '../config/supabaseClient';

async function main() {
  console.log("🧹 Starting cleanup of stress test messages...");

  try {
    // Delete all messages that start with the "STRESS_TEST" prefix
    const { count, error } = await supabase
      .from('messages')
      .delete({ count: 'exact' })
      .like('content', 'STRESS_TEST%');

    if (error) {
      throw error;
    }

    console.log(`✅ Success! Removed ${count || 0} stress test messages.`);
  } catch (error: any) {
    console.error("❌ Cleanup failed:", error.message);
  }
}

main();
