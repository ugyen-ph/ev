// src/middleware/errorHandler.js
const config = require('../config');

function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'That record already exists' });

  const status = err.statusCode || 500;
  if (status >= 500) console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  res.status(status).json({
    error: status >= 500 && config.isProd ? 'Internal server error' : err.message || 'Internal server error',
  });
}

module.exports = { notFound, errorHandler };
