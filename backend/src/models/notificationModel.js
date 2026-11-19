// src/models/notificationModel.js  (admin "system notifications")
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

async function findAll() {
  const [rows] = await pool.query('SELECT * FROM system_notifications ORDER BY created_at DESC, id DESC LIMIT 300');
  return rows.map(toClient);
}

async function create({ title, msg, type = 'info' }, conn) {
  const [result] = await run(conn).execute(
    'INSERT INTO system_notifications (title, msg, type, is_read, created_at) VALUES (?, ?, ?, 0, ?)',
    [String(title).slice(0, 150), String(msg).slice(0, 500), type, Date.now()]
  );
  return result.insertId;
}

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM system_notifications WHERE id = ?', [id]);
  return rows[0] ? toClient(rows[0]) : null;
}

async function setRead(id, read) {
  await pool.execute('UPDATE system_notifications SET is_read = ? WHERE id = ?', [read ? 1 : 0, id]);
}

async function markAllRead() {
  await pool.execute('UPDATE system_notifications SET is_read = 1 WHERE is_read = 0');
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM system_notifications WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, create, setRead, markAllRead, remove };
