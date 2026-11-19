// src/models/reportModel.js
const pool = require('../db');

const run = (conn) => conn || pool;
const numOrNull = (v) => (v === null || v === undefined ? null : Number(v));

function toClient(row) {
  return {
    id: row.id,
    userId: row.user_id,
    reporterName: row.user_name,
    stationId: row.station_id,
    stationName: row.station_name,
    type: row.type,
    note: row.note || '',
    status: row.status,
    createdAt: Number(row.created_at),
    resolvedAt: numOrNull(row.resolved_at),
  };
}

const SELECT = `
  SELECT r.*, u.name AS user_name, s.name AS station_name
  FROM reports r
  JOIN users u    ON u.id = r.user_id
  JOIN stations s ON s.id = r.station_id`;

async function findAll() {
  const [rows] = await pool.query(`${SELECT} ORDER BY r.created_at DESC, r.id DESC LIMIT 500`);
  return rows.map(toClient);
}

async function findByUser(userId) {
  const [rows] = await pool.execute(`${SELECT} WHERE r.user_id = ? ORDER BY r.created_at DESC, r.id DESC LIMIT 200`, [userId]);
  return rows.map(toClient);
}

async function findById(id, conn) {
  const [rows] = await run(conn).execute(`${SELECT} WHERE r.id = ?`, [id]);
  return rows[0] ? toClient(rows[0]) : null;
}

// Has this user already reported this problem at this station since `sinceMs`?
async function findRecent(conn, userId, stationId, type, sinceMs) {
  const [rows] = await conn.execute(
    'SELECT id FROM reports WHERE user_id = ? AND station_id = ? AND type = ? AND created_at > ? LIMIT 1',
    [userId, stationId, type, sinceMs]
  );
  return rows[0] || null;
}

async function create(conn, { userId, stationId, type, note }) {
  const [result] = await conn.execute(
    "INSERT INTO reports (user_id, station_id, type, note, status, created_at) VALUES (?, ?, ?, ?, 'open', ?)",
    [userId, stationId, type, note || null, Date.now()]
  );
  return findById(result.insertId, conn);
}

async function setStatus(id, status) {
  await pool.execute(
    'UPDATE reports SET status = ?, resolved_at = ? WHERE id = ?',
    [status, status === 'resolved' ? Date.now() : null, id]
  );
}

// Open reports newer than `sinceMs`, grouped by station. No reporter info on purpose:
// this is what ordinary users see on the station panel.
async function openPublicByStation(sinceMs) {
  const [rows] = await pool.execute(
    "SELECT id, station_id, type, created_at FROM reports WHERE status = 'open' AND created_at > ? ORDER BY created_at DESC",
    [sinceMs]
  );
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.station_id)) map.set(r.station_id, []);
    map.get(r.station_id).push({ id: r.id, type: r.type, createdAt: Number(r.created_at) });
  }
  return map;
}

async function countOpen() {
  const [rows] = await pool.query("SELECT COUNT(*) AS n FROM reports WHERE status = 'open'");
  return Number(rows[0].n);
}

module.exports = { findAll, findByUser, findById, findRecent, create, setStatus, openPublicByStation, countOpen };
