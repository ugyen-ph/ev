// src/models/ocppLogModel.js
const pool = require('../db');
const { parseJson } = require('../utils/sql');

function toClient(row) {
  return {
    id: row.id,
    stationId: row.station_id,
    action: row.action,
    type: row.action, // some admin pages read `type`, others `action`
    payload: parseJson(row.payload, {}),
    timestamp: Number(row.created_at),
  };
}

async function findRecent(limit = 200) {
  const [rows] = await pool.query('SELECT * FROM ocpp_logs ORDER BY created_at DESC, id DESC LIMIT ?', [limit]);
  return rows.map(toClient);
}

async function create({ stationId, action, payload }) {
  const [result] = await pool.execute(
    'INSERT INTO ocpp_logs (station_id, action, payload, created_at) VALUES (?, ?, ?, ?)',
    [stationId, action, JSON.stringify(payload || {}), Date.now()]
  );
  return result.insertId;
}

// Deletes logs whose payload.status matches (used to "clear faults"), optionally for one station.
async function removeByPayloadStatus(status, stationId = null) {
  const params = [status];
  let sql = "DELETE FROM ocpp_logs WHERE JSON_UNQUOTE(JSON_EXTRACT(payload, '$.status')) = ?";
  if (stationId) { sql += ' AND station_id = ?'; params.push(stationId); }
  const [result] = await pool.execute(sql, params);
  return result.affectedRows;
}

module.exports = { findRecent, create, removeByPayloadStatus };
