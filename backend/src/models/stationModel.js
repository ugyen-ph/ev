// src/models/stationModel.js
const pool = require('../db');
const { parseJson } = require('../utils/sql');

const run = (conn) => conn || pool;
const numOrNull = (v) => (v === null || v === undefined ? null : Number(v));

// Station row (+ its connectors) -> the shape the frontend already uses.
function toClient(row, connectors = []) {
  return {
    id: row.id,
    name: row.name,
    location: { lat: numOrNull(row.lat), lng: numOrNull(row.lng), address: row.address },
    status: row.status,
    connectors: connectors.map((c) => ({
      id: c.code, type: c.type, power: c.power, status: c.status, price: c.price,
    })),
    rating: Number(row.rating),
    amenities: parseJson(row.amenities, []),
    plugInUser: row.plug_in_user_id,
    plugInUserName: row.plug_in_user_name,
    activeSessionId: row.active_session_id,
    lastUpdated: Number(row.last_updated),
  };
}

async function loadConnectors(conn, ids) {
  if (ids.length === 0) return new Map();
  const [rows] = await run(conn).query(
    'SELECT * FROM connectors WHERE station_id IN (?) ORDER BY station_id, id', [ids]
  );
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.station_id)) map.set(r.station_id, []);
    map.get(r.station_id).push(r);
  }
  return map;
}

async function hydrate(rows, conn) {
  const connectors = await loadConnectors(conn, rows.map((r) => r.id));
  return rows.map((r) => toClient(r, connectors.get(r.id) || []));
}

async function findAll() {
  const [rows] = await pool.query('SELECT * FROM stations ORDER BY id');
  return hydrate(rows);
}

async function findById(id, conn) {
  const [rows] = await run(conn).execute('SELECT * FROM stations WHERE id = ?', [id]);
  return rows[0] ? (await hydrate(rows, conn))[0] : null;
}

// Locks the station row so concurrent waitlist joins / sessions on it are processed one at a time.
async function findByIdForUpdate(conn, id) {
  const [rows] = await conn.execute('SELECT * FROM stations WHERE id = ? FOR UPDATE', [id]);
  return rows[0] ? (await hydrate(rows, conn))[0] : null;
}

async function nextId(conn) {
  const [rows] = await conn.query(
    "SELECT MAX(CAST(SUBSTRING(id, 4) AS UNSIGNED)) AS n FROM stations WHERE id REGEXP '^st-[0-9]+$'"
  );
  return `st-${String((rows[0].n || 0) + 1).padStart(3, '0')}`;
}

async function replaceConnectors(conn, stationId, connectors) {
  await conn.execute('DELETE FROM connectors WHERE station_id = ?', [stationId]);
  const used = new Set();
  let i = 0;
  for (const c of connectors) {
    i += 1;
    let code = c.id || `c${i}`;
    while (used.has(code)) code = `c${i}-${used.size + 1}`;
    used.add(code);
    await conn.execute(
      'INSERT INTO connectors (station_id, code, type, power, status, price) VALUES (?, ?, ?, ?, ?, ?)',
      [stationId, code, c.type, c.power || null, c.status || 'available', c.price || null]
    );
  }
}

// data: { name, address, lat, lng, status, rating, amenities, connectors }
async function create(conn, data) {
  const id = await nextId(conn);
  const now = Date.now();
  await conn.execute(
    `INSERT INTO stations (id, name, address, lat, lng, status, rating, amenities, last_updated, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.name, data.address, data.lat, data.lng, data.status, data.rating,
     JSON.stringify(data.amenities), now, now]
  );
  await replaceConnectors(conn, id, data.connectors);
  return id;
}

async function update(conn, id, data) {
  await conn.execute(
    `UPDATE stations SET name = ?, address = ?, lat = ?, lng = ?, status = ?, rating = ?,
       amenities = ?, last_updated = ? WHERE id = ?`,
    [data.name, data.address, data.lat, data.lng, data.status, data.rating,
     JSON.stringify(data.amenities), Date.now(), id]
  );
  await replaceConnectors(conn, id, data.connectors);
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM stations WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

// Admin override. Going back to "available" also clears the plug-in markers.
async function setStatus(id, status) {
  if (status === 'available') {
    await pool.execute(
      `UPDATE stations SET status = ?,
         plug_in_user_id = NULL, plug_in_user_name = NULL, last_updated = ? WHERE id = ?`,
      [status, Date.now(), id]
    );
  } else {
    await pool.execute('UPDATE stations SET status = ?, last_updated = ? WHERE id = ?', [status, Date.now(), id]);
  }
}

async function setPlugIn(id, userId, userName) {
  await pool.execute(
    `UPDATE stations SET status = 'plug_in', plug_in_user_id = ?, plug_in_user_name = ?, last_updated = ?
     WHERE id = ?`,
    [userId, userName, Date.now(), id]
  );
}

async function setCharging(conn, id, sessionId) {
  await conn.execute(
    `UPDATE stations SET status = 'charging', active_session_id = ?, last_updated = ? WHERE id = ?`,
    [sessionId, Date.now(), id]
  );
}

// Charger is free again: clears the session and plug-in user.
async function release(conn, id) {
  await conn.execute(
    `UPDATE stations SET status = 'available', active_session_id = NULL, plug_in_user_id = NULL,
       plug_in_user_name = NULL, last_updated = ? WHERE id = ?`,
    [Date.now(), id]
  );
}

module.exports = {
  findAll, findById, findByIdForUpdate, create, update, remove,
  setStatus, setPlugIn, setCharging, release,
};
