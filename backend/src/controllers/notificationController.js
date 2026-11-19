// src/controllers/notificationController.js  (admin feed + the user's own inbox)
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { parseId, str } = require('../utils/validate');
const notificationModel = require('../models/notificationModel');
const userNotificationModel = require('../models/userNotificationModel');

const TYPES = ['info', 'success', 'alert', 'error'];

// GET /api/notifications/mine  (any logged-in user)
const mine = asyncHandler(async (req, res) => {
  res.json(await userNotificationModel.findByUser(req.user.id));
});

// POST /api/notifications/mine/read-all
const mineReadAll = asyncHandler(async (req, res) => {
  await userNotificationModel.markAllRead(req.user.id);
  res.json({ ok: true });
});

const list = asyncHandler(async (req, res) => {
  res.json(await notificationModel.findAll());
});

const create = asyncHandler(async (req, res) => {
  const title = str(req.body.title);
  const msg = str(req.body.msg);
  const type = req.body.type || 'info';
  if (!title || !msg) throw new HttpError(400, 'title and msg are required');
  if (!TYPES.includes(type)) throw new HttpError(400, 'Invalid notification type');
  const id = await notificationModel.create({ title, msg, type });
  res.status(201).json(await notificationModel.findById(id));
});

// PATCH /api/notifications/:id   { read: true|false }
const setRead = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, 'notification id');
  if (!(await notificationModel.findById(id))) throw new HttpError(404, 'Notification not found');
  await notificationModel.setRead(id, !!req.body.read);
  res.json(await notificationModel.findById(id));
});

const readAll = asyncHandler(async (req, res) => {
  await notificationModel.markAllRead();
  res.json({ ok: true });
});

const remove = asyncHandler(async (req, res) => {
  if (!(await notificationModel.remove(parseId(req.params.id, 'notification id')))) {
    throw new HttpError(404, 'Notification not found');
  }
  res.status(204).end();
});

module.exports = { mine, mineReadAll, list, create, setRead, readAll, remove };
