import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

// Use the Service Role Key to bypass RLS securely from your trusted backend
// persistSession: false prevents signInWithPassword from storing user sessions
// on this client, which would cause subsequent queries to use the user's JWT
// instead of the service role key (breaking RLS bypass).
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export default supabase;