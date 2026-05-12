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
export async function generateEmailOtp(userId: string, email: string, purpose: string) {
  // 1. Global cleanup of stale codes (Gap 2)
  await supabase
    .from('mfa_email_otps')
    .delete()
    .lt('expires_at', new Date().toISOString());

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
      throw new Error(`Please wait ${Math.ceil(COOLDOWN_SECONDS - diff)} seconds before requesting a new code.`);
    }
  }

  // 3. Generate 6-digit code
  const code = crypto.randomInt(100000, 999999).toString();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

  // 4. Upsert the new code (Handles Race Condition Gap 1 via UNIQUE constraint)
  // We use delete + insert to reset attempt counts and timestamps properly
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
      attempts: 0
    });

  if (insertError) {
    console.error("[MfaService] Database Error:", insertError);
    throw new Error("Failed to generate security code. Please try again.");
  }

  // 5. Send Email with rollback on failure (Gap 5)
  try {
    await sendMfaEmail(email, code, purpose);
  } catch (emailError) {
    console.error("[MfaService] Email failure, rolling back OTP record:", emailError);
    await supabase.from('mfa_email_otps').delete().eq('user_id', userId).eq('purpose', purpose);
    throw new Error("Failed to deliver security email. Please try again later.");
  }

  return { message: "Security code sent to your email." };
}

/**
 * Verifies the provided code against the stored hash.
 * Increments attempt count on failure and deletes on success or exhaustion.
 */
export async function verifyEmailOtp(userId: string, code: string, purpose: string) {
  // 1. Fetch the OTP
  const { data: otpData, error: fetchError } = await supabase
    .from('mfa_email_otps')
    .select('*')
    .eq('user_id', userId)
    .eq('purpose', purpose)
    .maybeSingle();

  // Gap 3: Sanitize "Not Found" error to avoid leaking state
  if (fetchError || !otpData) {
    throw new Error("Invalid or expired security code. Please request a new one.");
  }

  // 2. Check expiration
  if (new Date(otpData.expires_at) < new Date()) {
    await deleteOtp(otpData.id);
    throw new Error("Invalid or expired security code. Please request a new one.");
  }

  // 3. Verify Code Hash
  const isValid = await bcrypt.compare(code, otpData.code_hash);

  if (!isValid) {
    const newAttempts = otpData.attempts + 1;
    
    if (newAttempts >= MAX_ATTEMPTS) {
      await deleteOtp(otpData.id);
      throw new Error("Too many failed attempts. This code is now invalid. Please request a new one.");
    }

    // Increment attempts
    await supabase
      .from('mfa_email_otps')
      .update({ attempts: newAttempts })
      .eq('id', otpData.id);

    // UX vs Security trade-off: We'll keep the remaining attempts count as it's highly useful for users 
    // and the risk of brute-forcing 6 digits in 3 attempts is negligible.
    throw new Error(`Invalid security code. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`);
  }

  // 4. Success! Delete the OTP record (single use)
  await deleteOtp(otpData.id);

  return true;
}

/**
 * Internal helper to delete an OTP record
 */
async function deleteOtp(id: string) {
  await supabase.from('mfa_email_otps').delete().eq('id', id);
}

/**
 * Template for MFA Email
 */
async function sendMfaEmail(toEmail: string, code: string, purpose: string) {
  const subject = purpose === 'setup' 
    ? "Verify your Deezcord MFA Setup" 
    : "Your Deezcord Security Code";

  const actionText = purpose === 'setup'
    ? "completing your MFA setup"
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
