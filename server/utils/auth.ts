import { createClient } from '@supabase/supabase-js';
import supabase from '../config/supabaseClient';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

export async function signIn(identifier: string, password: string) {
    try {
        let email = identifier;

        // If identifier doesn't have an '@', resolve it to an email via the profiles table
        if (!identifier.includes('@')) {
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('email')
                .eq('username', identifier)
                .single();

            if (profileError || !profileData?.email) {
                throw new Error("Invalid username or password.");
            }

            email = profileData.email;
        }

        // Create a fresh, temporary client for this specific login request.
        // This avoids modifying the shared singleton's auth state and
        // ensures we don't need to call signOut() which would revoke the session.
        const authClient = createClient(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        });

        const { data, error } = await authClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        return { 
            token: data.session.access_token, 
            user: data.user 
        };
    } catch (error: any) {
        console.error("Authentication failed:", error.message);
        throw error;
    }
}

export default signIn;

export async function signUp(email: string, password: string, username: string) {
    try {
        // Use the Admin API because we are on a secure backend using the Service Key
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            user_metadata: {
                username: username,
            },
            email_confirm: true // This auto-verifies the email so they can log in immediately
        });

        if (error) throw error;

        // NOTE: The public.profiles entry is now created automatically by a 
        // Postgres trigger (handle_new_user_profile) on the auth.users table.
        
        return data;
    } catch (error: any) {
        console.log("Registration failed.", error.message);
        throw error;
    }
}