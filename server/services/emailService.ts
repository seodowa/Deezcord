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
    pass: process.env.SMTP_PASS,
  },
};

console.log(`[EmailService] Initializing SMTP with host: ${smtpConfig.host}, port: ${smtpConfig.port}, user: ${smtpConfig.auth.user}`);

const transporter = nodemailer.createTransport(smtpConfig);

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
      <p><strong>${requesterUsername}</strong> sent you a friend request on Deezcord.</p>
      <p>Log in to your account to accept or decline the request.</p>
      <br />
      <hr />
      <p style="font-size: 0.8em; color: #666;">This is an automated notification. Please do not reply to this email.</p>
    </div>
  `;
  return sendEmail(toEmail, subject, html);
}
