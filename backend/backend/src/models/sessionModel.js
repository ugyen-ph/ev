// src/models/sessionModel.js
const pool = require('../db');

const run = (conn) => conn || pool;
const iso = (ms) => (ms === null || ms === undefined ? null : new Date(Number(ms)).toISOString());

function toClient(row) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    stationId: row.station_id,
    stationName: row.station_name,
    status: row.status,
    energyConsumed: Number(row.energy_consumed),
    source: row.source,
    startTime: iso(row.start_time),
    endTime: iso(row.end_time),
    createdAt: Number(row.created_at),
  };
}

async function findAll() {
  const [rows] = await pool.query('SELECT * FROM sessions ORDER BY created_at DESC LIMIT 1000');
  return rows.map(toClient);
}

async function findByUser(userId) {
  const [rows] = await pool.execute('SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 500', [userId]);
  return rows.map(toClient);
}

async function findById(id, conn) {
  const [rows] = await run(conn).execute('SELECT * FROM sessions WHERE id = ?', [id]);
  return rows[0] ? toClient(rows[0]) : null;
}

async function findByIdForUpdate(conn, id) {
  const [rows] = await conn.execute('SELECT * FROM sessions WHERE id = ? FOR UPDATE', [id]);
  return rows[0] ? toClient(rows[0]) : null;
}

async function findActiveByUser(conn, userId) {
  const [rows] = await conn.execute(
    "SELECT * FROM sessions WHERE user_id = ? AND status = 'active' LIMIT 1", [userId]
  );
  return rows[0] ? toClient(rows[0]) : null;
}

async function create(conn, s) {
  const now = Date.now();
  const [result] = await conn.execute(
    `INSERT INTO sessions (user_id, user_name, station_id, station_name, status, source,
       start_time, created_at) VALUES (?, ?, ?, ?, 'active', ?, ?, ?)`,
    [s.userId, s.userName, s.stationId, s.stationName, s.source || 'app', now, now]
  );
  return findById(result.insertId, conn);
}

async function complete(conn, id, { energyConsumed }) {
  await conn.execute(
    "UPDATE sessions SET status = 'completed', energy_consumed = ?, end_time = ? WHERE id = ?",
    [energyConsumed, Date.now(), id]
  );
}

module.exports = { findAll, findByUser, findById, findByIdForUpdate, findActiveByUser, create, complete };
