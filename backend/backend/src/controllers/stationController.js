// src/controllers/stationController.js
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const withTransaction = require('../utils/transaction');
const { str } = require('../utils/validate');
const config = require('../config');
const stationModel = require('../models/stationModel');
const waitlistModel = require('../models/waitlistModel');
const reportModel = require('../models/reportModel');
const sessionService = require('../services/sessionService');
const waitlistService = require('../services/waitlistService');

const STATION_STATUSES = ['available', 'occupied', 'charging', 'offline', 'locked', 'plug_in'];
const CONNECTOR_STATUSES = ['available', 'occupied', 'charging', 'offline', 'locked'];

// Regular users don't get to see who is using a charger.
function forViewer(station, viewer) {
  if (viewer.role === 'admin') return station;
  const { plugInUser, plugInUserName, ...safe } = station; // eslint-disable-line no-unused-vars
  return safe;
}

// Adds waitlist + report info the station panel needs:
//   waitlistCount      how many people are waiting
//   myWaitlistPosition my place in line (null if I'm not waiting)
//   openReports        open reports from the last 24h - type and time only, never the reporter's name
async function decorate(stations, viewer) {
  const [counts, mine, reports] = await Promise.all([
    waitlistModel.countsByStation(),
    waitlistModel.findByUser(viewer.id),
    reportModel.openPublicByStation(Date.now() - config.reportVisibleMs),
  ]);
  const myPos = new Map(mine.map((w) => [w.stationId, w.position]));
  return stations.map((s) => ({
    ...s,
    waitlistCount: counts.get(s.id) || 0,
    myWaitlistPosition: myPos.has(s.id) ? myPos.get(s.id) : null,
    openReports: reports.get(s.id) || [],
  }));
}

const toCoord = (v, min, max, label) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw new HttpError(400, `Invalid ${label}`);
  return n;
};

// Accepts both { location: { lat, lng, address } } and flat { address, lat, lng }.
function parseStationBody(body) {
  const loc = body.location || {};
  const name = str(body.name);
  const address = str(loc.address !== undefined ? loc.address : body.address);
  if (!name) throw new HttpError(400, 'Station name is required');
  if (!address) throw new HttpError(400, 'Station address is required');
  if (name.length > 150 || address.length > 255) throw new HttpError(400, 'Name or address is too long');

  const status = body.status || 'available';
  if (!STATION_STATUSES.includes(status)) throw new HttpError(400, 'Invalid station status');

  const rating = body.rating === undefined || body.rating === '' ? 0 : Number(body.rating);
  if (!Number.isFinite(rating) || rating < 0 || rating > 5) throw new HttpError(400, 'Rating must be between 0 and 5');

  const rawConnectors = Array.isArray(body.connectors) ? body.connectors : [];
  if (rawConnectors.length > 20) throw new HttpError(400, 'Too many connectors');
  const connectors = rawConnectors.map((c) => {
    const type = str(c.type);
    if (!type) throw new HttpError(400, 'Every connector needs a type');
    const cStatus = c.status || 'available';
    if (!CONNECTOR_STATUSES.includes(cStatus)) throw new HttpError(400, 'Invalid connector status');
    return {
      id: str(c.id).slice(0, 10) || undefined,
      type: type.slice(0, 60),
      power: str(c.power).slice(0, 20),
      status: cStatus,
      price: str(c.price).slice(0, 40),
    };
  });

  const amenities = Array.isArray(body.amenities)
    ? body.amenities.map((a) => str(a)).filter(Boolean).slice(0, 20)
    : [];

  return {
    name,
    address,
    lat: toCoord(loc.lat !== undefined ? loc.lat : body.lat, -90, 90, 'latitude'),
    lng: toCoord(loc.lng !== undefined ? loc.lng : body.lng, -180, 180, 'longitude'),
    status,
    rating,
    amenities,
    connectors,
  };
}

// GET /api/stations
const list = asyncHandler(async (req, res) => {
  const stations = await decorate(await stationModel.findAll(), req.user);
  res.json(stations.map((s) => forViewer(s, req.user)));
});

// GET /api/stations/:id
const getOne = asyncHandler(async (req, res) => {
  const station = await stationModel.findById(req.params.id);
  if (!station) throw new HttpError(404, 'Station not found');
  const [decorated] = await decorate([station], req.user);
  res.json(forViewer(decorated, req.user));
});

// POST /api/stations  (admin)
const create = asyncHandler(async (req, res) => {
  const data = parseStationBody(req.body);
  const id = await withTransaction((conn) => stationModel.create(conn, data));
  res.status(201).json(await stationModel.findById(id));
});

// PUT /api/stations/:id  (admin)
const update = asyncHandler(async (req, res) => {
  const existing = await stationModel.findById(req.params.id);
  if (!existing) throw new HttpError(404, 'Station not found');
  const data = parseStationBody(req.body);
  await withTransaction((conn) => stationModel.update(conn, existing.id, data));
  await waitlistService.checkStation(existing.id);
  res.json(await stationModel.findById(existing.id));
});

// PATCH /api/stations/:id/status  (admin) - remote override
const setStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!STATION_STATUSES.includes(status)) throw new HttpError(400, 'Invalid station status');
  if (!(await stationModel.findById(req.params.id))) throw new HttpError(404, 'Station not found');
  await stationModel.setStatus(req.params.id, status);
  await waitlistService.checkStation(req.params.id); // admin set it to available -> notify the first in line now
  res.json(await stationModel.findById(req.params.id));
});

// DELETE /api/stations/:id  (admin)
const remove = asyncHandler(async (req, res) => {
  if (!(await stationModel.remove(req.params.id))) throw new HttpError(404, 'Station not found');
  res.status(204).end();
});

// POST /api/stations/:id/plug-in  - user scanned the QR code (currently blocked, see sessionService)
const plugIn = asyncHandler(async (req, res) => {
  const station = await sessionService.plugIn({ user: req.user, stationId: req.params.id });
  res.json(forViewer(station, req.user));
});

module.exports = { list, getOne, create, update, setStatus, remove, plugIn };
