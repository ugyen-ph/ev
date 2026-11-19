// src/controllers/reportController.js
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { parseId, str } = require('../utils/validate');
const reportModel = require('../models/reportModel');
const reportService = require('../services/reportService');

// POST /api/reports   { stationId, type, note? }
const create = asyncHandler(async (req, res) => {
  const stationId = str(req.body.stationId);
  const type = str(req.body.type);
  const note = str(req.body.note);
  if (!stationId) throw new HttpError(400, 'Please choose a station');
  if (note.length > 500) throw new HttpError(400, 'Note is too long (max 500 characters)');
  res.status(201).json(await reportService.submit({ user: req.user, stationId, type, note }));
});

// GET /api/reports/mine
const mine = asyncHandler(async (req, res) => {
  res.json(await reportModel.findByUser(req.user.id));
});

// GET /api/reports  (admin)
const listAll = asyncHandler(async (req, res) => {
  res.json(await reportModel.findAll());
});

// PATCH /api/reports/:id/status  (admin)   { status: 'open' | 'resolved' }
const setStatus = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, 'report id');
  const { status } = req.body;
  if (!['open', 'resolved'].includes(status)) throw new HttpError(400, 'Status must be open or resolved');
  if (!(await reportModel.findById(id))) throw new HttpError(404, 'Report not found');
  await reportModel.setStatus(id, status);
  res.json(await reportModel.findById(id));
});

module.exports = { create, mine, listAll, setStatus };
