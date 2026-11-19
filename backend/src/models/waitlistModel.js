// src/models/waitlistModel.js
// One row per user per station. Queue order = order of `id` (strict first-joined).
const pool = require('../db');

const run = (conn) => conn || pool;
const numOrNull = (v) => (v === null || v === undefined ? null : Number(v));

function toClient(row) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    stationId: row.station_id,
    stationName: row.station_name,
    position: Number(row.position),
    joinedAt: Number(row.joined_at),
    notifiedAt: numOrNull(row.notified_at),
  };
}

// Entry + user name + station name + position in its station's queue.
const SELECT = `
  SELECT w.*, u.name AS user_name, s.name AS station_name,
    (SELECT COUNT(*) FROM waitlist w2 WHERE w2.station_id = w.station_id AND w2.id <= w.id) AS position
  FROM waitlist w
  JOIN users u    ON u.id = w.user_id
  JOIN stations s ON s.id = w.station_id`;

async function findAll() {
  const [rows] = await pool.query(`${SELECT} ORDER BY w.station_id, w.id`);
  return rows.map(toClient);
}

async function findByUser(userId) {
  const [rows] = await pool.execute(`${SELECT} WHERE w.user_id = ? ORDER BY w.id`, [userId]);
  return rows.map(toClient);
}

async function findById(id, conn) {
  const [rows] = await run(conn).execute(`${SELECT} WHERE w.id = ?`, [id]);
  return rows[0] ? toClient(rows[0]) : null;
}

async function findByUserAndStation(userId, stationId, conn) {
  const [rows] = await run(conn).execute(`${SELECT} WHERE w.user_id = ? AND w.station_id = ?`, [userId, stationId]);
  return rows[0] ? toClient(rows[0]) : null;
}

async function add(conn, userId, stationId) {
  const [result] = await conn.execute(
    'INSERT INTO waitlist (user_id, station_id, joined_at) VALUES (?, ?, ?)',
    [userId, stationId, Date.now()]
  );
  return findById(result.insertId, conn);
}

async function remove(id, conn) {
  const [result] = await run(conn).execute('DELETE FROM waitlist WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

async function removeByUserAndStation(userId, stationId, conn) {
  const [result] = await run(conn).execute('DELETE FROM waitlist WHERE user_id = ? AND station_id = ?', [userId, stationId]);
  return result.affectedRows > 0;
}

// First person in line (oldest id) at a station.
async function findFirst(conn, stationId) {
  const [rows] = await conn.execute(`${SELECT} WHERE w.station_id = ? ORDER BY w.id LIMIT 1`, [stationId]);
  return rows[0] ? toClient(rows[0]) : null;
}

async function markNotified(conn, id) {
  await conn.execute('UPDATE waitlist SET notified_at = ? WHERE id = ?', [Date.now(), id]);
}

// Station became busy again: everyone can be notified again next time it frees up.
async function resetNotified(conn, stationId) {
  await conn.execute('UPDATE waitlist SET notified_at = NULL WHERE station_id = ? AND notified_at IS NOT NULL', [stationId]);
}

async function stationIdsWithEntries() {
  const [rows] = await pool.query('SELECT DISTINCT station_id FROM waitlist');
  return rows.map((r) => r.station_id);
}

// Map of stationId -> number of people waiting.
async function countsByStation() {
  const [rows] = await pool.query('SELECT station_id, COUNT(*) AS n FROM waitlist GROUP BY station_id');
  return new Map(rows.map((r) => [r.station_id, Number(r.n)]));
}

async function countAll() {
  const [rows] = await pool.query('SELECT COUNT(*) AS n FROM waitlist');
  return Number(rows[0].n);
}

module.exports = {
  findAll, findByUser, findById, findByUserAndStation, add, remove, removeByUserAndStation,
  findFirst, markNotified, resetNotified, stationIdsWithEntries, countsByStation, countAll,
};
