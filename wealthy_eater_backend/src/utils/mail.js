const { Resend } = require('resend');
const nodemailer = require('nodemailer');

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || process.env.FROM || 'no-reply@wealthyeater.online';

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 0);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';

let resendClient = null;
let transporter = null;

if (RESEND_API_KEY) {
  try {
    resendClient = new Resend(RESEND_API_KEY);
    console.log('[Mail] Resend client initialized successfully.');
  } catch (err) {
    console.error('[Mail] Failed to initialize Resend client:', err.message);
  }
}

function getTransporter() {
  if (transporter) return transporter;
  if (!SMTP_HOST || !SMTP_PORT) return null;

  try {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
    return transporter;
  } catch (err) {
    console.error('[Mail] Failed to create SMTP transporter:', err.message);
    return null;
  }
}

async function sendMail(to, subject, text, html) {
  if (resendClient) {
    try {
      const { data, error } = await resendClient.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject,
        text,
        html,
      });
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[Mail] Resend sendMail error:', err.message || err);
      // Fallback to SMTP if Resend fails
    }
  }

  const transport = getTransporter();
  if (transport) {
    try {
      const info = await transport.sendMail({ from: FROM_EMAIL, to, subject, text, html });
      return info;
    } catch (err) {
      console.error('[Mail] SMTP sendMail error:', err.message);
      throw err;
    }
  }

  // Console Fallback
  console.log('\n======================================================');
  console.log('[Mail Fallback Console Log]');
  console.log('To:', to);
  console.log('Subject:', subject);
  console.log('Text:', text);
  console.log('======================================================\n');
  return { success: true, message: 'Logged to console' };
}

async function sendVerificationEmail({ to, otp, ttlMinutes = 5 }) {
  const subject = 'Wealthy Eater verification code';
  const text = `Your Wealthy Eater verification code is:\n\n${otp}\n\nThis code expires in ${ttlMinutes} minutes.`;
  const html = `<div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; padding:20px; border:1px solid #eee; border-radius:8px;">
    <h2 style="color:#2c3e50;">Wealthy Eater — Verification Code</h2>
    <p>Your verification code is:</p>
    <p style="font-size:32px; letter-spacing:8px; font-weight:bold; font-family:monospace; background:#f5f5f5; padding:12px; border-radius:6px; text-align:center;">${otp}</p>
    <p style="color:#666; margin-top:12px;">This code will expire in ${ttlMinutes} minutes.</p>
    <p style="color:#999; font-size:12px; margin-top:18px;">If you did not request this, please ignore.</p>
  </div>`;

  return sendMail(to, subject, text, html);
}

module.exports = { sendMail, sendVerificationEmail };
