// src/controllers/sessionController.js
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { parseId } = require('../utils/validate');
const sessionModel = require('../models/sessionModel');
const sessionService = require('../services/sessionService');

// GET /api/sessions  (admins get every session, users get their own)
const list = asyncHandler(async (req, res) => {
  const sessions = req.user.role === 'admin'
    ? await sessionModel.findAll()
    : await sessionModel.findByUser(req.user.id);
  res.json(sessions);
});

// POST /api/sessions   { stationId }
const start = asyncHandler(async (req, res) => {
  const { stationId } = req.body;
  if (!stationId || typeof stationId !== 'string') throw new HttpError(400, 'stationId is required');
  const session = await sessionService.start({ user: req.user, stationId });
  res.status(201).json(session);
});

// POST /api/sessions/:id/stop
const stop = asyncHandler(async (req, res) => {
  const result = await sessionService.stop({ sessionId: parseId(req.params.id, 'session id'), actor: req.user });
  res.json(result); // { session, energyConsumed }
});

module.exports = { list, start, stop };
