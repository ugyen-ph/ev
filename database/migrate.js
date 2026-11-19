// One-off migration for an EXISTING database that still has the reservation tables.
// Usage: npm run db:migrate     (safe to run twice: "already gone" errors are ignored)
// New installs don't need this - npm run db:init already creates the final schema.
const fs = require('fs');
const path = require('path');
const mysql2 = require('mysql2/promise');
const dbConfig = require('../backend/src/config/dbConfig');

// MySQL error codes meaning "that thing is already gone / not there".
const IGNORE = new Set([
  1091, // can't DROP column/key - doesn't exist
  1051, // unknown table
  1054, // unknown column
  1146, // table doesn't exist
  1025, // error on rename / drop FK
  1060, // duplicate column name (already added)
]);

const DROPS = [
  'ALTER TABLE sessions DROP FOREIGN KEY fk_sessions_booking',
  'ALTER TABLE sessions DROP COLUMN booking_id',
  'ALTER TABLE sessions DROP COLUMN total_cost',
  'DROP TABLE IF EXISTS bookings',
  'ALTER TABLE users DROP COLUMN credits',
  'ALTER TABLE stations DROP COLUMN reserved_by',
  'ALTER TABLE stations DROP COLUMN reserved_until',
  "UPDATE stations SET status = 'available' WHERE status = 'reserved'",
  "UPDATE connectors SET status = 'available' WHERE status = 'reserved'",
  'ALTER TABLE users ADD COLUMN is_verified TINYINT(1) NOT NULL DEFAULT 0',
  'ALTER TABLE users ADD COLUMN verify_token_hash CHAR(64) NULL',
  'ALTER TABLE users ADD COLUMN verify_token_expires_at BIGINT NULL',
  "UPDATE users SET is_verified = 1 WHERE role = 'admin'",
];

(async () => {
  let conn;
  try {
    conn = await mysql2.createConnection({ ...dbConfig, multipleStatements: true });
    // 1) create the new tables (CREATE TABLE IF NOT EXISTS)
    await conn.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
    console.log('New tables ready (waitlist, user_notifications, reports).');
    // 2) remove the old reservation / wallet pieces
    for (const sql of DROPS) {
      try {
        await conn.query(sql);
        console.log('ok   ', sql);
      } catch (err) {
        if (IGNORE.has(err.errno)) console.log('skip ', sql, `(${err.code})`);
        else throw err;
      }
    }
    console.log('Migration finished.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.code || '', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
})();
