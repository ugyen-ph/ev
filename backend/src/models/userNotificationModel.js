// src/models/userNotificationModel.js  (the user's own inbox - what the bell shows)
const pool = require('../db');

const run = (conn) => conn || pool;

function toClient(row) {
  return {
    id: row.id,
    title: row.title,
    msg: row.msg,
    type: row.type,
    read: !!row.is_read,
    timestamp: Number(row.created_at),
  };
}

async function create({ userId, title, msg, type = 'info' }, conn) {
  const [result] = await run(conn).execute(
    'INSERT INTO user_notifications (user_id, title, msg, type, is_read, created_at) VALUES (?, ?, ?, ?, 0, ?)',
    [userId, String(title).slice(0, 150), String(msg).slice(0, 500), type, Date.now()]
  );
  return result.insertId;
}

async function findByUser(userId) {
  const [rows] = await pool.execute(
    'SELECT * FROM user_notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 50', [userId]
  );
  return rows.map(toClient);
}

async function markAllRead(userId) {
  await pool.execute('UPDATE user_notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);
}

module.exports = { create, findByUser, markAllRead };
