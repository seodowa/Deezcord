import { createClient } from '@supabase/supabase-js';
import supabase from '../config/supabaseClient';
import { sendPasswordResetEmail } from '../services/emailService';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

export async function signIn(identifier: string, password: string, deviceId: string) {
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

        // Register deviceId in app_metadata
        if (data.user) {
            const currentDevices = data.user.app_metadata?.devices || [];
            if (!currentDevices.includes(deviceId)) {
                // Cap at 10 devices (FIFO)
                const updatedDevices = [...currentDevices, deviceId].slice(-10);

                const { error: updateError } = await supabase.auth.admin.updateUserById(
                    data.user.id,
                    {
                        app_metadata: {
                            ...data.user.app_metadata,
                            devices: updatedDevices
                        }
                    }
                );
                if (updateError) console.error("Failed to register deviceId:", updateError.message);
            }
        }

        return { 
            token: data.session.access_token, 
            refreshToken: data.session.refresh_token,
            user: data.user 
        };
    } catch (error: any) {
        console.error("Authentication failed:", error.message);
        throw error;
    }
}

/**
 * Refreshes an existing session using a refresh token.
 */
export async function refreshSession(refreshToken: string, deviceId: string) {
    try {
        const authClient = createClient(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        });

        const { data, error } = await authClient.auth.refreshSession({
            refresh_token: refreshToken
        });

        if (error) throw error;

        // Verify deviceId
        const devices = data.user?.app_metadata?.devices || [];
        if (!devices.includes(deviceId)) {
            throw new Error("Unauthorized: Device not recognized.");
        }

        return {
            token: data.session?.access_token,
            refreshToken: data.session?.refresh_token,
            user: data.user
        };
    } catch (error: any) {
        console.error("Session refresh failed:", error.message);
        throw error;
    }
}

export default signIn;

export async function signUp(email: string, password: string, username: string) {
    try {
        console.log(`[Auth] Attempting to register user: ${email} (${username})`);
        
        // Check if username or email already exists in profiles
        const { data: existingProfiles, error: profilesError } = await supabase
            .from('profiles')
            .select('username, email')
            .or(`username.eq.${username},email.eq.${email}`);

        if (profilesError) {
            console.error('[Auth] Error checking existing user:', profilesError.message);
            throw new Error("Error validating user availability.");
        }

        if (existingProfiles && existingProfiles.length > 0) {
            const hasUsername = existingProfiles.some(p => p.username.toLowerCase() === username.toLowerCase());
            const hasEmail = existingProfiles.some(p => p.email.toLowerCase() === email.toLowerCase());
            
            if (hasUsername && hasEmail) {
                throw new Error("Username and email already exist.");
            } else if (hasUsername) {
                throw new Error("Username already exists.");
            } else {
                throw new Error("Email already exists.");
            }
        }

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
                emailRedirectTo: `${process.env.APP_URL || 'http://localhost:5173'}/verify`
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

/**
 * Sends a password reset email to the user.
 */
export async function forgotPassword(email: string) {
    try {
        // Construct a safe redirect URL
        let baseUrl = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
        const redirectTo = `${baseUrl}/reset-password`;
        
        console.log(`[Auth] Generating recovery link for: ${email} (Redirect: ${redirectTo})`);
        
        const { data, error } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email,
            options: {
                redirectTo
            }
        });

        if (error) {
            // To prevent user enumeration, we don't reveal if the user doesn't exist
            console.warn(`[Auth] Recovery link generation failed for ${email}:`, error.message);
            return { message: "If an account exists, a reset link has been sent." };
        }

        // Send the custom email with the generated link
        await sendPasswordResetEmail(email, data.properties.action_link);
        
        console.log(`[Auth] Custom reset email sent successfully to ${email}`);
        return data;
    } catch (error: any) {
        console.error("[Auth] Forgot password exception:", error.message);
        throw error;
    }
}

/**
 * Resets the user's password using the recovery code or access token.
 */
export async function resetPassword(codeOrToken: string, password: string) {
    try {
        // Create a dedicated auth client for this operation
        const authClient = createClient(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            }
        });

        let accessToken = codeOrToken;

        // 1. If it's a short PKCE code, exchange it for a session
        if (codeOrToken.length < 100) {
            console.log("[Auth] Exchanging PKCE code for session...");
            const { data, error } = await authClient.auth.exchangeCodeForSession(codeOrToken);
            if (error) {
                console.error("[Auth] Code exchange failed:", error.message);
                throw error;
            }
            accessToken = data.session.access_token;
        } 
        
        // 2. Use the admin API to update the password directly.
        // This is safer in a server-side context than trying to manage user sessions.
        // First, we need the user ID. We can get it from the token.
        const { data: { user }, error: userError } = await authClient.auth.getUser(accessToken);
        
        if (userError || !user) {
            console.error("[Auth] Failed to identify user from token:", userError?.message);
            throw new Error("Invalid or expired reset token.");
        }

        console.log(`[Auth] Updating password for user: ${user.id}`);

        const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
            user.id,
            { password: password }
        );

        if (updateError) throw updateError;

        return updateData;
    } catch (error: any) {
        console.error("[Auth] Reset password error:", error.message);
        throw error;
    }
}
