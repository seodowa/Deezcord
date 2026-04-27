import supabase from '../config/supabaseClient';

async function signIn(email?: string, password?: string) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email || process.env.email || '',
            password: password || process.env.password || ''
        });

        if (error) throw error;

        return data.session.access_token;
    } catch (error: any) {
        console.log("Authentication failed.", error.message);
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

        return data;
    } catch (error: any) {
        console.log("Registration failed.", error.message);
        throw error;
    }
}