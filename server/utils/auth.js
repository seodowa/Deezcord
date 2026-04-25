async function signIn( email, password ) {
    const supabase = require('../config/supabaseClient');

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
        email: process.env.email,
        password: process.env.password
        });

        if (error) throw error;

        return data.session.access_token;
    } catch (error) {
        console.log("Authentication failed.", error.message);
        throw error;
    }
}

module.exports = signIn;