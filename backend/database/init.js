// Creates all tables from database/schema.sql.   Usage: npm run db:init
const fs = require('fs');
const path = require('path');
const mysql2 = require('mysql2/promise');
const dbConfig = require('../backend/src/config/dbConfig');

(async () => {
  let conn;
  try {
    conn = await mysql2.createConnection({ ...dbConfig, multipleStatements: true });
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await conn.query(sql);
    const [tables] = await conn.query('SHOW TABLES');
    console.log(`Schema applied to "${dbConfig.database}". Tables: ${tables.length}`);
    process.exit(0);
  } catch (err) {
    console.error('Schema failed:', err.code || '', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
})();
