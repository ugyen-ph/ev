// src/controllers/authController.js
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const { EMAIL_RE, str } = require('../utils/validate');
const HttpError = require('../utils/httpError');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const config = require('../config');
const { signToken } = require('../middleware/auth');
const { sendVerificationEmail, sendPasswordResetEmail, generateVerificationCode } = require('../authService');
const { checkPasswordPolicy } = require('../passwordValidation');
const userModel = require('../models/userModel');

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const name = str(req.body.name);
  const email = str(req.body.email).toLowerCase();
  const password = req.body.password;
  if (!name || !email || !password) throw new HttpError(400, 'Name, email and password are required');
  if (name.length > 100) throw new HttpError(400, 'Name is too long');
  if (!EMAIL_RE.test(email) || email.length > 190) throw new HttpError(400, 'Please enter a valid email address');

  checkPasswordPolicy(password);

  const existing = await userModel.findAuthByEmail(email);
  if (existing) {
    if (existing.is_verified) {
      throw new HttpError(409, 'An account with this email already exists');
    }
    // Unverified account – update name/password and resend a fresh code
    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
    await userModel.update(existing.id, { name, passwordHash });
    const code = generateVerificationCode();
    await userModel.setVerifyToken(existing.id, sha256(code), Date.now() + 15 * 60 * 1000);
    if (config.smtpUse) {
      try { await sendVerificationEmail(email, code); } catch (e) { console.error('[Email Error]', e); }
    }
    return res.status(200).json({
      requiresVerification: true,
      email,
      message: 'A new 6-digit code has been sent to your email.',
    });
  }

  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
  const user = await userModel.create({ name, email, passwordHash, role: 'user' });

  const code = generateVerificationCode();
  await userModel.setVerifyToken(user.id, sha256(code), Date.now() + 15 * 60 * 1000);

  if (config.smtpUse) {
    try { await sendVerificationEmail(email, code); } catch (e) { console.error('[Email Error]', e); }
  }

  res.status(201).json({
    requiresVerification: true,
    email,
    message: 'Account created! Check your email for a 6-digit verification code.',
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const email = str(req.body.email).toLowerCase();
  const password = req.body.password;
  if (!email || typeof password !== 'string' || !password) throw new HttpError(400, 'Email and password are required');

  const found = await userModel.findAuthByEmail(email);
  const ok = found && (await bcrypt.compare(password, found.passwordHash));
  if (!ok) throw new HttpError(401, 'Invalid email or password');
  if (found.status === 'blocked') throw new HttpError(403, 'Your account has been blocked. Contact support.');
  if (found.role !== 'admin' && !found.is_verified) throw new HttpError(403, 'Please verify your email first. Check your inbox for the 6-digit code.');

  const { passwordHash, ...user } = found;
  await userModel.touch(user.id, null);
  res.json({ token: signToken(user), user });
});

// GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  await userModel.markOffline(req.user.id);
  res.json({ ok: true });
});

// GET & POST /api/auth/verify-email (legacy token-based – kept for compatibility)
const verifyEmail = asyncHandler(async (req, res) => {
  const token = str(req.query.token || req.body?.token);
  if (!token) throw new HttpError(400, 'Verification token is required');

  const user = await userModel.verifyEmailByToken(token);
  if (!user) throw new HttpError(400, 'Invalid or expired verification link');

  res.json({ ok: true, user, message: 'Email verified! Welcome to EV Hub.' });
});

// POST /api/auth/verify-code
const verifyCode = asyncHandler(async (req, res) => {
  const email = str(req.body.email).toLowerCase();
  const code = str(req.body.code).trim();
  if (!email || !code) throw new HttpError(400, 'Email and code are required');

  const user = await userModel.verifyEmailByCode(email, code);
  if (!user) throw new HttpError(400, 'Invalid or expired code. Please request a new one.');

  res.json({ ok: true, token: signToken(user), user, message: 'Email verified! Welcome to EV Hub.' });
});

// POST /api/auth/resend-code
const resendCode = asyncHandler(async (req, res) => {
  const email = str(req.body.email).toLowerCase();
  if (!email) throw new HttpError(400, 'Email is required');

  const user = await userModel.findAuthByEmail(email);
  // Always return 200 to avoid leaking whether email exists
  if (!user || user.is_verified) {
    return res.json({ ok: true, message: 'If an unverified account exists, a new code has been sent.' });
  }

  const code = generateVerificationCode();
  await userModel.setVerifyToken(user.id, sha256(code), Date.now() + 15 * 60 * 1000);
  if (config.smtpUse) {
    try { await sendVerificationEmail(email, code); } catch (e) { console.error('[Email Error]', e); }
  }

  res.json({ ok: true, message: 'A new verification code has been sent to your email.' });
});

// POST /api/auth/resend-verification (alias for backward compat)
const resendVerification = resendCode;

// POST /api/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const email = str(req.body.email).toLowerCase();
  if (!email) throw new HttpError(400, 'Please enter your email');

  const user = await userModel.findAuthByEmail(email);
  if (user && user.role !== 'admin' && !user.is_verified) {
    return res.json({ ok: true, message: 'Please verify your email first.' });
  }
  if (!user || user.status === 'blocked') {
    return res.json({ ok: true, message: 'If an account exists, a reset email has been sent.' });
  }

  const token = crypto.randomBytes(24).toString('hex');
  const resetUrl = `${req.headers.origin || 'http://localhost:5173'}/auth/reset-password?token=${token}`;

  await userModel.createResetToken(user.id, sha256(token), Date.now() + config.resetTokenTtlMs);

  if (config.smtpUse) {
    try { await sendPasswordResetEmail(email, token, resetUrl); } catch (e) { console.error('[Email Error]', e); }
  }

  const response = { ok: true, message: 'If an account exists, a reset email has been sent.' };
  if (!config.isProd) response.resetToken = token;
  res.json(response);
});

// POST /api/auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const token = str(req.body.token);
  const password = req.body.password;
  if (!token) throw new HttpError(400, 'Reset token is required');
  if (!password) throw new HttpError(400, 'Password is required');

  checkPasswordPolicy(password);

  const userId = await userModel.consumeResetToken(sha256(token));
  if (!userId) throw new HttpError(400, 'This reset link is invalid or has expired');

  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
  await userModel.update(userId, { passwordHash });
  res.json({ ok: true, message: 'Password updated. You can now log in.' });
});

module.exports = { register, login, me, logout, verifyEmail, verifyCode, resendCode, resendVerification, forgotPassword, resetPassword };
