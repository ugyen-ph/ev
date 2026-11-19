// src/config/dbConfig.js
// Connection settings shared by the pool (src/db.js) and the init/seed scripts.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const fs = require('fs');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'defaultdb',
  // DATE columns come back as 'YYYY-MM-DD' strings instead of JS Date objects.
  dateStrings: true,
};

// Aiven requires an encrypted (SSL) connection.
if ((process.env.DB_SSL || '').toUpperCase() === 'REQUIRED') {
  const ssl = { rejectUnauthorized: false };
  if (process.env.DB_SSL_CA && fs.existsSync(process.env.DB_SSL_CA)) {
    ssl.ca = fs.readFileSync(process.env.DB_SSL_CA);
    ssl.rejectUnauthorized = true;
  }
  dbConfig.ssl = ssl;
}

module.exports = dbConfig;
