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
        console.log(`[Auth] Attempting to register user: ${email} (${username})`);
        
        // Use the standard signUp method to trigger the auto-verification email flow.
        // admin.createUser bypasses the email flow by design.
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username: username,
                },
                // Redirect user to the /verify page after they click the link
                emailRedirectTo: `${process.env.APP_URL}/verify`
            }
        });

        if (error) {
            console.error('[Auth] Supabase registration error:', error.message);
            throw error;
        }

        console.log(`[Auth] Registration successful for ${email}. Verification email should be triggered.`);
        
        return data;
    } catch (error: any) {
        console.error("[Auth] Registration exception:", error.message);
        throw error;
    }
}