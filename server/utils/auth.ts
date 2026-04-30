import supabase from '../config/supabaseClient';

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

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        // Extract what we need before clearing the session
        const token = data.session.access_token;
        const user = data.user;

        // IMPORTANT: Clear the in-memory user session so the Supabase client
        // reverts to using the service role key for all subsequent DB queries.
        // Without this, the client stays "logged in" as this user and RLS
        // blocks the profiles lookup on the next login attempt.
        await supabase.auth.signOut();

        return { token, user };
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