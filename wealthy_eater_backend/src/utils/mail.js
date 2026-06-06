const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 0);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.FROM_EMAIL || process.env.FROM || 'no-reply@wealthyeater.com';

let transporter = null;
let smtpConfigured = false;

function getTransporter() {
  if (transporter) return transporter;

  if (!SMTP_HOST || !SMTP_PORT) {
    console.warn('[Mail] SMTP not configured - emails will fallback to console');
    smtpConfigured = false;
    return null;
  }

  try {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
    smtpConfigured = true;
    return transporter;
  } catch (err) {
    console.error('[Mail] Failed to create transporter:', err.message);
    smtpConfigured = false;
    return null;
  }
}

async function sendMail(to, subject, text, html) {
  const transport = getTransporter();
  if (!transport) {
    console.log('Email fallback:');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Text:', text);
    return Promise.resolve();
  }

  try {
    const info = await transport.sendMail({ from: FROM_EMAIL, to, subject, text, html });
    return info;
  } catch (err) {
    console.error('[Mail] sendMail error:', err.message);
    throw err;
  }
}

async function sendVerificationEmail({ to, otp, ttlMinutes = 5 }) {
  const transport = getTransporter();
  const subject = 'Wealthy Eater verification code';
  const text = `Your Wealthy Eater verification code is:\n\n${otp}\n\nThis code expires in ${ttlMinutes} minutes.`;
  const html = `<div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; padding:20px; border:1px solid #eee; border-radius:8px;">
    <h2 style="color:#2c3e50;">Wealthy Eater — Verification Code</h2>
    <p>Your verification code is:</p>
    <p style="font-size:32px; letter-spacing:8px; font-weight:bold; font-family:monospace; background:#f5f5f5; padding:12px; border-radius:6px; text-align:center;">${otp}</p>
    <p style="color:#666; margin-top:12px;">This code will expire in ${ttlMinutes} minutes.</p>
    <p style="color:#999; font-size:12px; margin-top:18px;">If you did not request this, please ignore.</p>
  </div>`;

  if (!transport) {
    // dev fallback: log
    console.log('Email fallback:');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Text:', text);
    return Promise.resolve();
  }

  try {
    const info = await transport.sendMail({ from: FROM_EMAIL, to, subject, text, html });
    return info;
  } catch (err) {
    console.error('[Mail] Failed to send verification email:', err.message);
  }
}

module.exports = { sendMail, sendVerificationEmail };
