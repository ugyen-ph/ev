// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./src/config');
const routes = require('./src/routes');
const { notFound, errorHandler } = require('./src/middleware/errorHandler');
const waitlistJob = require('./src/jobs/waitlistJob');

const app = express();

if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })); // API is called from other origins
app.use(cors({
  origin(origin, callback) {
    // No Origin header = curl / server-to-server / same-origin: allow.
    if (!origin || config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) return callback(null, true);
    const err = new Error(`Origin ${origin} is not allowed by CORS`);
    err.statusCode = 403;
    return callback(err);
  },
}));
app.use(express.json({ limit: '100kb' }));

app.get('/', (req, res) => res.json({ name: 'EV Hub API', health: '/api/health' }));
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

async function ensureSchema() {
  const pool = require('./src/db');
  const columns = [
    'ALTER TABLE users ADD COLUMN is_verified TINYINT(1) NOT NULL DEFAULT 0',
    'ALTER TABLE users ADD COLUMN verify_token_hash CHAR(64) NULL',
    'ALTER TABLE users ADD COLUMN verify_token_expires_at BIGINT NULL',
  ];
  for (const sql of columns) {
    try {
      await pool.execute(sql);
    } catch (err) {
      if (err.errno !== 1060) {
        // 1060 is ER_DUP_FIELDNAME (column already exists)
        console.warn('[schema]', err.message);
      }
    }
  }
}

if (require.main === module) {
  app.listen(config.port, async () => {
    console.log(`EV Hub API running at http://localhost:${config.port}`);
    await ensureSchema();
    waitlistJob.start();
  });
}

module.exports = app;
