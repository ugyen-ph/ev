// src/authService.js
const crypto = require('crypto');
const config = require('./config');
const userModel = require('./models/userModel');
const { sendEmail } = require('./services/emailService');

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, code) {
  const subject = `EV Hub - Your Verification Code is ${code}`;
  const text = `Welcome to EV Hub!\n\nYour 6-digit verification code is: ${code}\n\nEnter this code on the website to activate your account.\n\nThis code will expire in 15 minutes.\n\nIf you didn't sign up, you can safely ignore this email.`;
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 520px; margin: 0 auto; padding: 30px; background-color: #0f172a; color: #f8fafc; border-radius: 12px; border: 1px solid #1e293b;">
      <div style="text-align: center; margin-bottom: 25px;">
        <span style="font-size: 28px;">⚡</span>
        <h1 style="color: #10b981; font-size: 24px; margin: 10px 0 5px 0;">EV Hub Verification</h1>
        <p style="color: #94a3b8; font-size: 14px; margin: 0;">Bhutan's Electric Vehicle Charging Network</p>
      </div>

      <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; text-align: center;">
        Use the 6-digit code below to verify your email address and activate your account:
      </p>

      <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 2px dashed #10b981; border-radius: 10px; padding: 20px; text-align: center; margin: 30px 0;">
        <span style="font-family: monospace; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #10b981;">${code}</span>
      </div>

      <p style="color: #64748b; font-size: 13px; text-align: center; margin: 0;">
        This code is valid for 15 minutes. Never share this code with anyone.
      </p>
    </div>
  `;
  return sendEmail(email, subject, text, html);
}

async function sendPasswordResetEmail(email, token, resetUrl) {
  const fullUrl = `${resetUrl}?token=${token}`;
  const subject = 'EV Hub - Password Reset';
  const text = `You requested a password reset.\n\nYour reset code is: ${token}\n\nEnter this code on the website to reset your password.\n\nOr copy this link to your browser:\n${fullUrl}\n\nThis code is valid for 1 hour.\n\nIf you didn't request this, ignore this email.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <h2 style="color: #2563eb;">🔑 Password Reset Request</h2>
      <p>You requested a password reset for EV Hub. Enter your reset code on the site or click below:</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0; font-size: 13px; color: #555;"><strong>Reset Code:</strong></p>
        <p style="margin: 5px 0 0 0; font-family: monospace; font-size: 20px; font-weight: bold; color: #111; letter-spacing: 2px;">${token}</p>
      </div>
      <div style="margin: 25px 0;">
        <a href="${fullUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
      </div>
      <p style="color: #999; font-size: 12px;">This link and code are valid for 1 hour. If you did not request this, please ignore this email.</p>
    </div>
  `;
  return sendEmail(email, subject, text, html);
}

module.exports = {
  generateVerificationCode,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
