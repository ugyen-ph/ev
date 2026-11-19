// src/models/userModel.js
const crypto = require('crypto');
const pool = require('../db');
const config = require('../config');
const { buildUpdate } = require('../utils/sql');

const run = (conn) => conn || pool;

// Database row -> the shape the frontend expects. Never includes the password hash.
function rowToUser(row) {
  if (!row) return null;
  const lastSeen = row.last_seen === null || row.last_seen === undefined ? null : Number(row.last_seen);
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || '',
    vehicle: row.vehicle || '',
    role: row.role,
    status: row.status,
    is_verified: Boolean(row.is_verified),
    isVerified: Boolean(row.is_verified),
    lastSeen,
    online: lastSeen !== null && Date.now() - lastSeen < config.onlineWindowMs,
    createdAt: Number(row.created_at),
  };
}

async function findAll() {
  const [rows] = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
  return rows.map(rowToUser);
}

async function findById(id, conn) {
  const [rows] = await run(conn).execute('SELECT * FROM users WHERE id = ?', [id]);
  return rowToUser(rows[0]);
}

// Includes the password hash - only for login / password checks.
async function findAuthByEmail(email) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
  if (!rows[0]) return null;
  return { ...rowToUser(rows[0]), passwordHash: rows[0].password_hash };
}

async function findAuthById(id) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
  if (!rows[0]) return null;
  return { ...rowToUser(rows[0]), passwordHash: rows[0].password_hash };
}

async function emailTaken(email, exceptId = 0) {
  const [rows] = await pool.execute('SELECT id FROM users WHERE email = ? AND id <> ?', [email, exceptId]);
  return rows.length > 0;
}

async function create({ name, email, passwordHash, phone, vehicle, role = 'user' }) {
  const [result] = await pool.execute(
    `INSERT INTO users (name, email, password_hash, phone, vehicle, role, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`,
    [name, email, passwordHash, phone || null, vehicle || null, role, Date.now()]
  );
  return findById(result.insertId);
}

// fields: any of name, phone, vehicle, passwordHash, status, role
async function update(id, fields) {
  const upd = buildUpdate('users', id, {
    name: fields.name,
    phone: fields.phone,
    vehicle: fields.vehicle,
    password_hash: fields.passwordHash,
    status: fields.status,
    role: fields.role,
  });
  if (upd) await pool.execute(upd.sql, upd.params);
  return findById(id);
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

// Records "seen now" at most every 30 seconds so we don't write on every request.
async function touch(id, previousLastSeen) {
  if (previousLastSeen && Date.now() - previousLastSeen < 30000) return;
  await pool.execute('UPDATE users SET last_seen = ? WHERE id = ?', [Date.now(), id]);
}

async function markOffline(id) {
  await pool.execute('UPDATE users SET last_seen = ? WHERE id = ?', [Date.now() - config.onlineWindowMs - 1000, id]);
}

async function counts() {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) AS registered, SUM(last_seen > ?) AS online FROM users',
    [Date.now() - config.onlineWindowMs]
  );
  return { registered: Number(rows[0].registered), online: Number(rows[0].online || 0) };
}

// ---- Password reset tokens ----
async function createResetToken(userId, tokenHash, expiresAt) {
  await pool.execute('UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0', [userId]);
  await pool.execute(
    'INSERT INTO password_resets (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)',
    [userId, tokenHash, expiresAt, Date.now()]
  );
}

// Returns the user id if the token is valid, and marks it used. Otherwise null.
async function consumeResetToken(tokenHash) {
  const [rows] = await pool.execute(
    'SELECT id, user_id FROM password_resets WHERE token_hash = ? AND used = 0 AND expires_at > ?',
    [tokenHash, Date.now()]
  );
  if (!rows[0]) return null;
  await pool.execute('UPDATE password_resets SET used = 1 WHERE id = ?', [rows[0].id]);
  return rows[0].user_id;
}

// Returns the user row if the verification token is valid and not expired. Otherwise null.
async function verifyEmailByToken(token) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE verify_token_hash = ? AND verify_token_expires_at > ? AND is_verified = 0',
    [tokenHash, Date.now()]
  );
  if (!rows[0]) return null;

  // Mark as verified and clear token
  await pool.execute(
    'UPDATE users SET is_verified = 1, verify_token_hash = NULL, verify_token_expires_at = NULL WHERE id = ?',
    [rows[0].id]
  );
  return findById(rows[0].id);
}

// Returns the user row if the verification code matches and is not expired.
async function verifyEmailByCode(email, code) {
  const codeHash = crypto.createHash('sha256').update(code.trim()).digest('hex');
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE email = ? AND verify_token_hash = ? AND verify_token_expires_at > ? AND is_verified = 0',
    [email.toLowerCase(), codeHash, Date.now()]
  );
  if (!rows[0]) return null;

  await pool.execute(
    'UPDATE users SET is_verified = 1, verify_token_hash = NULL, verify_token_expires_at = NULL WHERE id = ?',
    [rows[0].id]
  );
  return findById(rows[0].id);
}

// Store verification token when creating user
async function setVerifyToken(userId, tokenHash, expiresAt) {
  await pool.execute(
    'UPDATE users SET verify_token_hash = ?, verify_token_expires_at = ? WHERE id = ?',
    [tokenHash, expiresAt, userId]
  );
}

module.exports = {
  findAll, findById, findAuthByEmail, findAuthById, emailTaken, create, update, remove,
  touch, markOffline, counts, createResetToken, consumeResetToken, verifyEmailByToken, verifyEmailByCode, setVerifyToken,
};
