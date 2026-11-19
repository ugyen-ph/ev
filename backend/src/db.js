// src/db.js
// MySQL connection pool. Import this wherever you need to query the database.
const mysql2 = require('mysql2/promise');
const dbConfig = require('./config/dbConfig');

const pool = mysql2.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
