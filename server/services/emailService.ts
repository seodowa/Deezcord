import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * emailService.ts
 * 
 * Handles sending custom application emails (notifications, etc.) 
 * using Google's SMTP service.
 * 
 * Note: Authentication-related emails (verification, password reset)
 * are handled directly by Supabase via its Custom SMTP settings.
 */

const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: (process.env.SMTP_PORT === '465'), // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: (process.env.SMTP_PASS || '').replace(/\s/g, ''), // Remove spaces from app password
  },
};

console.log(`[EmailService] Initializing SMTP with host: ${smtpConfig.host}, port: ${smtpConfig.port}, user: ${smtpConfig.auth.user}`);

const transporter = nodemailer.createTransport(smtpConfig);

/**
 * Escapes HTML special characters to prevent injection
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Verify connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('[EmailService] SMTP Connection Error:', error);
  } else {
    console.log('[EmailService] SMTP Server is ready to take our messages');
  }
});

/**
 * Generic function to send an email
 */
export async function sendEmail(to: string, subject: string, html: string) {
  try {
    const info = await transporter.sendMail({
      from: `"Deezcord Notifications" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log('[EmailService] Message sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('[EmailService] Error sending email:', error);
    throw error;
  }
}

/**
 * Template: Friend Request Notification
 */
export async function sendFriendRequestEmail(toEmail: string, requesterUsername: string) {
  const subject = `New Friend Request on Deezcord!`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #4f46e5;">Hello!</h2>
      <p><strong>${escapeHtml(requesterUsername)}</strong> sent you a friend request on Deezcord.</p>
      <p>Log in to your account to accept or decline the request.</p>
      <br />
      <hr />
      <p style="font-size: 0.8em; color: #666;">This is an automated notification. Please do not reply to this email.</p>
    </div>
  `;
  return sendEmail(toEmail, subject, html);
}

/**
 * Template: Password Reset Link
 */
export async function sendPasswordResetEmail(toEmail: string, resetLink: string) {
  const subject = `Reset Your Deezcord Password`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #4f46e5;">Password Reset Request</h2>
      <p>We received a request to reset your password for your Deezcord account.</p>
      <p>Click the button below to set a new password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${escapeHtml(resetLink)}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
      </div>
      <p>If you didn't request this, you can safely ignore this email.</p>
      <p>This link will expire soon.</p>
      <br />
      <hr />
      <p style="font-size: 0.8em; color: #666;">This is an automated notification. Please do not reply to this email.</p>
    </div>
  `;
  return sendEmail(toEmail, subject, html);
}

/**
 * Template: Email Change Request (Current Email)
 */
export async function sendEmailChangeCurrentEmail(toEmail: string, verificationLink: string) {
  const subject = `Confirm Email Change on Deezcord`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #4f46e5;">Email Change Requested</h2>
      <p>We received a request to change the email address associated with your Deezcord account.</p>
      <p>To confirm this change, please click the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${escapeHtml(verificationLink)}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Confirm Email Change</a>
      </div>
      <p>If you did not request this change, please ignore this email and your address will remain the same.</p>
      <br />
      <hr />
      <p style="font-size: 0.8em; color: #666;">This is an automated notification. Please do not reply to this email.</p>
    </div>
  `;
  return sendEmail(toEmail, subject, html);
}

/**
 * Template: Email Change Verification (New Email)
 */
export async function sendEmailChangeNewEmail(toEmail: string, verificationLink: string) {
  const subject = `Verify Your New Email Address on Deezcord`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #4f46e5;">Verify New Email</h2>
      <p>You recently requested to change your Deezcord account email to this address.</p>
      <p>To verify this new email address, please click the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${escapeHtml(verificationLink)}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email Address</a>
      </div>
      <p>If you did not request this, please ignore this email.</p>
      <br />
      <hr />
      <p style="font-size: 0.8em; color: #666;">This is an automated notification. Please do not reply to this email.</p>
    </div>
  `;
  return sendEmail(toEmail, subject, html);
}
