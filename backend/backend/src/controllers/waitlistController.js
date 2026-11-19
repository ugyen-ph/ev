// src/controllers/waitlistController.js
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { parseId, str } = require('../utils/validate');
const waitlistModel = require('../models/waitlistModel');
const waitlistService = require('../services/waitlistService');

// GET /api/waitlist/mine - the stations I'm waiting for, with my position
const mine = asyncHandler(async (req, res) => {
  res.json(await waitlistModel.findByUser(req.user.id));
});

// POST /api/waitlist   { stationId }
const join = asyncHandler(async (req, res) => {
  const stationId = str(req.body.stationId);
  if (!stationId) throw new HttpError(400, 'stationId is required');
  const entry = await waitlistService.join({ user: req.user, stationId });
  res.status(201).json(entry);
});

// DELETE /api/waitlist/station/:stationId - leave my own place in line
const leave = asyncHandler(async (req, res) => {
  if (!(await waitlistService.leave({ user: req.user, stationId: req.params.stationId }))) {
    throw new HttpError(404, 'You are not on the waitlist for this station');
  }
  res.status(204).end();
});

// GET /api/waitlist  (admin) - everyone waiting, per station, in order
const listAll = asyncHandler(async (req, res) => {
  res.json(await waitlistModel.findAll());
});

// DELETE /api/waitlist/:id  (admin)
const adminRemove = asyncHandler(async (req, res) => {
  await waitlistService.adminRemove(parseId(req.params.id, 'waitlist id'));
  res.status(204).end();
});

module.exports = { mine, join, leave, listAll, adminRemove };
