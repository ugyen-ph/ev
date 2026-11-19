// src/middleware/auth.js
// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const config = require('../config');
const HttpError = require('../utils/httpError');

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new HttpError(401, 'Authentication required');
  }
  const payload = verifyToken(parts[1]);
  req.user = { id: payload.sub, role: payload.role };
  next();
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    throw new HttpError(403, 'Admin access required');
  }
  next();
}

module.exports = { signToken, verifyToken, authenticate, requireAdmin };
const userModel = require('../models/userModel');

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

// Requires "Authorization: Bearer <token>". Loads the user fresh from the database on every
// request, so a blocked or deleted account stops working immediately.
async function authenticate(req, res, next) {
  try {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new HttpError(401, 'Authentication required');

    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch (_) {
      throw new HttpError(401, 'Session expired. Please log in again.');
    }

    const user = await userModel.findById(payload.sub);
    if (!user) throw new HttpError(401, 'Account no longer exists');
    if (user.status === 'blocked') throw new HttpError(403, 'Your account has been blocked. Contact support.');

    req.user = user;
    userModel.touch(user.id, user.lastSeen).catch(() => {}); // presence heartbeat, never blocks the request
    next();
  } catch (err) {
    next(err);
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return next(new HttpError(403, 'Admin access required'));
  next();
}

module.exports = { signToken, authenticate, requireAdmin };
