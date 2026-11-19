const pool = require('../db');

// Runs fn(connection) inside a MySQL transaction. Commits on success, rolls back on error.
async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try { await conn.rollback(); } catch (_) { /* ignore rollback errors */ }
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = withTransaction;
