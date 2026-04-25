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