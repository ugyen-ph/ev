// src/services/emailService.js
const nodemailer = require('nodemailer');
const config = require('../config');

const { smtpUse, smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom } = config;

let transporter = null;

function createTransporter() {
  if (!smtpUse) return null;
  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    auth: { user: smtpUser, pass: smtpPass },
  });
}

function getTransporter() {
  if (!transporter && smtpUse) {
    transporter = createTransporter();
  }
  return transporter;
}

async function sendEmail(to, subject, text, html) {
  const t = getTransporter();
  if (!t) return Promise.resolve();

  const mailOptions = {
    from: smtpFrom,
    to,
    subject,
    text,
    html: html || undefined,
  };

  try {
    await t.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('[SMTP Error]', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { sendEmail, getTransporter };
