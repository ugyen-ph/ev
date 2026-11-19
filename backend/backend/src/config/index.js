// src/config/index.js
// Central place for every setting read from the environment.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const isProd = process.env.NODE_ENV === 'production';

let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret === 'change-me-to-a-long-random-string') {
  if (isProd) {
    throw new Error('JWT_SECRET must be set to a long random value in production.');
  }
  jwtSecret = 'dev-only-insecure-secret';
  console.warn('[config] JWT_SECRET is not set - using an insecure development secret.');
}

const num = (value, fallback) => {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

module.exports = {
  isProd,
  port: num(process.env.PORT, 3000),

  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  bcryptRounds: num(process.env.BCRYPT_ROUNDS, 10),
  minPasswordLength: 6,

  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5177')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  // Background check that notifies the first person on a waitlist when a station becomes free.
  waitlistJobEnabled: (process.env.WAITLIST_JOB || '').toLowerCase() !== 'off',
  waitlistCheckSeconds: Math.max(1, num(process.env.WAITLIST_CHECK_SECONDS, 5)),

  // Limits for problem reports.
  reportCooldownMs: 60 * 60 * 1000,      // one report per user + station + type per hour
  reportVisibleMs: 24 * 60 * 60 * 1000,  // open reports show on the station panel for 24 hours

  // A user counts as "online" if the API saw them within this window.
  onlineWindowMs: 2 * 60 * 1000,
  resetTokenTtlMs: 60 * 60 * 1000,

  // SMTP (Email)
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: num(process.env.SMTP_PORT, 587),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || process.env.SMTP_USER || '',
  smtpUse: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
};
