// src/controllers/ocppLogController.js  (admin only)
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { str } = require('../utils/validate');
const ocppLogModel = require('../models/ocppLogModel');

const list = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 200, 1), 500);
  res.json(await ocppLogModel.findRecent(limit));
});

// POST /api/ocpp-logs   { stationId, action (or type), payload }
const create = asyncHandler(async (req, res) => {
  const stationId = str(req.body.stationId);
  const action = str(req.body.action || req.body.type);
  if (!stationId || !action) throw new HttpError(400, 'stationId and action are required');
  const payload = req.body.payload && typeof req.body.payload === 'object' ? req.body.payload : {};
  const id = await ocppLogModel.create({ stationId, action: action.slice(0, 50), payload });
  res.status(201).json({ id });
});

// DELETE /api/ocpp-logs?status=Faulted[&stationId=st-001]  - clears fault entries
const clear = asyncHandler(async (req, res) => {
  const status = str(req.query.status);
  if (!status) throw new HttpError(400, 'status query parameter is required');
  const deleted = await ocppLogModel.removeByPayloadStatus(status, str(req.query.stationId) || null);
  res.json({ deleted });
});

module.exports = { list, create, clear };
