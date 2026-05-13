import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import supabase from '../config/supabaseClient';
import { sendEmail } from './emailService';

/**
 * mfaService.ts
 * 
 * Handles custom application-level Email MFA OTPs.
 */

const OTP_EXPIRY_MINUTES = 5;
const COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 3;

/**
 * Generates a random 6-digit OTP, hashes it, and stores it in the database.
 * Then sends the plain code via email.
 */
export async function generateEmailOtp(userId: string, email: string, purpose: string, targetEmail?: string) {
  // 1. Global cleanup of stale codes (fire-and-forget to prevent blocking)
  (async () => {
    try {
      await supabase
        .from('mfa_email_otps')
        .delete()
        .lt('expires_at', new Date().toISOString());
    } catch (err) {
      console.error("[MfaService] Cleanup Error:", err);
    }
  })();

  // 2. Check for cooldown (prevent spamming)
  const { data: existingOtp, error: fetchError } = await supabase
    .from('mfa_email_otps')
    .select('created_at')
    .eq('user_id', userId)
    .eq('purpose', purpose)
    .maybeSingle();

  if (!fetchError && existingOtp) {
    const lastSent = new Date(existingOtp.created_at).getTime();
    const now = Date.now();
    const diff = (now - lastSent) / 1000;

    if (diff < COOLDOWN_SECONDS) {
      // Instead of throwing an error, return success so the user can re-enter the verification screen
      // and use the code that was already sent to them.
      return { message: `A code was already sent recently. Please check your email.` };
    }
  }

  // 3. Generate 6-digit code
  const code = crypto.randomInt(100000, 999999).toString();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

  // 4. Upsert the new code
  await supabase
    .from('mfa_email_otps')
    .delete()
    .eq('user_id', userId)
    .eq('purpose', purpose);

  const { error: insertError } = await supabase
    .from('mfa_email_otps')
    .insert({
      user_id: userId,
      code_hash: codeHash,
      expires_at: expiresAt.toISOString(),
      purpose,
      attempts: 0,
      ...(targetEmail && { target_email: targetEmail }),
    });

  if (insertError) {
    console.error("[MfaService] Database Error:", insertError);
    throw new Error("Failed to generate security code. Please try again.");
  }

  // 5. Send Email with rollback on failure (Fire-and-forget to prevent blocking)
  sendMfaEmail(email, code, purpose).catch(async (emailError) => {
    console.error("[MfaService] Email failure, rolling back OTP record:", emailError);
    await supabase.from('mfa_email_otps').delete().eq('user_id', userId).eq('purpose', purpose);
  });

  return { message: "Security code sent to your email." };
}

/**
 * Verifies the provided code against the stored hash.
 * Increments attempt count on failure and deletes on success or exhaustion.
 */
export async function verifyEmailOtp(userId: string, code: string, purpose: string, expectedTargetEmail?: string) {
  // 1. Fetch the OTP
  const { data: otpData, error: fetchError } = await supabase
    .from('mfa_email_otps')
    .select('*')
    .eq('user_id', userId)
    .eq('purpose', purpose)
    .maybeSingle();

  if (fetchError || !otpData) {
    throw new Error("Invalid or expired security code. Please request a new one.");
  }

  // 2. Check expiration
  if (new Date(otpData.expires_at) < new Date()) {
    await deleteOtp(otpData.id);
    throw new Error("Invalid or expired security code. Please request a new one.");
  }

  // 3. Verify target email binding
  if (expectedTargetEmail && otpData.target_email !== expectedTargetEmail) {
    throw new Error("Invalid or expired security code. Please request a new one.");
  }

  // 4. Verify Code Hash
  const isValid = await bcrypt.compare(code, otpData.code_hash);

  if (!isValid) {
    const newAttempts = otpData.attempts + 1;
    
    if (newAttempts >= MAX_ATTEMPTS) {
      await deleteOtp(otpData.id);
      throw new Error("Too many failed attempts. This code is now invalid. Please request a new one.");
    }

    await supabase
      .from('mfa_email_otps')
      .update({ attempts: newAttempts })
      .eq('id', otpData.id);

    throw new Error(`Invalid security code. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`);
  }

  // 5. Success! Delete the OTP record (single use)
  await deleteOtp(otpData.id);

  return true;
}

/**
 * Creates a short-lived (5-min) "Identity Verified" session in the database.
 * This bridges the gap between the initial MFA unlock and the subsequent account update.
 */
export async function createIdentitySession(userId: string) {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

  // Clear any existing sessions for this user
  await supabase
    .from('mfa_email_otps')
    .delete()
    .eq('user_id', userId)
    .eq('purpose', 'identity_verified');

  const { error } = await supabase
    .from('mfa_email_otps')
    .insert({
      user_id: userId,
      purpose: 'identity_verified',
      code_hash: 'session_active', // Dummy hash since we don't need to verify a code
      expires_at: expiresAt.toISOString(),
      attempts: 0
    });

  if (error) {
    console.error("[MfaService] Failed to create identity session:", error);
    throw new Error(`Security system error: ${error.message}`);
  }
}

/**
 * Checks if a valid identity session exists for the user.
 * Throws a specific error if the session is invalid or expired.
 */
export async function verifyIdentitySession(userId: string) {
  const { data, error } = await supabase
    .from('mfa_email_otps')
    .select('id, expires_at')
    .eq('user_id', userId)
    .eq('purpose', 'identity_verified')
    .maybeSingle();

  if (error || !data) {
    throw new Error("Identity verification required. Please unlock your security settings first.");
  }

  if (new Date(data.expires_at) < new Date()) {
    await deleteOtp(data.id);
    throw new Error("Identity verification required. Please unlock your security settings first.");
  }

  return true;
}

/**
 * Consumes the identity session to prevent reuse.
 */
export async function consumeIdentitySession(userId: string) {
  await supabase
    .from('mfa_email_otps')
    .delete()
    .eq('user_id', userId)
    .eq('purpose', 'identity_verified');
}

/**
 * Internal helper to delete an OTP record
 */
async function deleteOtp(id: string) {
  await supabase.from('mfa_email_otps').delete().eq('id', id);
}

/**
 * Template for MFA Email
 * Handles different purposes including 'email_change'
 */
async function sendMfaEmail(toEmail: string, code: string, purpose: string) {
  const subject = purpose === 'setup' 
    ? "Verify your Deezcord MFA Setup"
    : purpose === 'email_change'
    ? "Verify Your New Email Address"
    : "Your Deezcord Security Code";

  const actionText = purpose === 'setup'
    ? "completing your MFA setup"
    : purpose === 'email_change'
    ? "verifying your new email address"
    : "authorizing a sensitive action";

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #4f46e5; text-align: center;">Security Verification</h2>
      <p>Hello,</p>
      <p>You are receiving this code because you are ${actionText} on Deezcord.</p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 10px; padding: 10px 20px; background-color: #f3f4f6; border-radius: 8px;">${code}</span>
      </div>
      <p style="text-align: center; color: #666; font-size: 0.9em;">This code will expire in ${OTP_EXPIRY_MINUTES} minutes.</p>
      <p>If you did not request this code, please ignore this email and ensure your account is secure.</p>
      <br />
      <hr />
      <p style="font-size: 0.8em; color: #666;">This is an automated security notification. Please do not reply to this email.</p>
    </div>
  `;

  return sendEmail(toEmail, subject, html);
}
