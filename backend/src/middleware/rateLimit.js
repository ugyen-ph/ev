// src/middleware/rateLimit.js
const rateLimit = require('express-rate-limit');

// Slows down password guessing on login / register / reset.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
});

module.exports = { authLimiter };
