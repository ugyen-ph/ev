// src/controllers/userController.js
const bcrypt = require('bcryptjs');
const config = require('../config');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { str, parseId } = require('../utils/validate');
const userModel = require('../models/userModel');
const { checkPassword } = require('./authController');

// PATCH /api/users/me  - the logged-in user edits their own profile
const updateMe = asyncHandler(async (req, res) => {
  const fields = {};
  if (req.body.name !== undefined) {
    fields.name = str(req.body.name);
    if (!fields.name || fields.name.length > 100) throw new HttpError(400, 'Please enter a valid name');
  }
  if (req.body.phone !== undefined) fields.phone = str(req.body.phone).slice(0, 30) || null;
  if (req.body.vehicle !== undefined) fields.vehicle = str(req.body.vehicle).slice(0, 100) || null;

  // Changing the password needs the current one.
  if (req.body.newPassword) {
    checkPassword(req.body.newPassword);
    const auth = await userModel.findAuthById(req.user.id);
    const ok = typeof req.body.currentPassword === 'string' &&
      (await bcrypt.compare(req.body.currentPassword, auth.passwordHash));
    if (!ok) throw new HttpError(400, 'Current password is incorrect');
    fields.passwordHash = await bcrypt.hash(req.body.newPassword, config.bcryptRounds);
  }

  const user = await userModel.update(req.user.id, fields);
  res.json({ user });
});

// GET /api/users  (admin)
const list = asyncHandler(async (req, res) => {
  res.json(await userModel.findAll());
});

// GET /api/users/stats  (admin)
const stats = asyncHandler(async (req, res) => {
  const { registered, online } = await userModel.counts();
  res.json({ registeredUsers: registered, onlineUsers: online });
});

// PATCH /api/users/:id  (admin) - block/unblock or change role
const adminUpdate = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, 'user id');
  const target = await userModel.findById(id);
  if (!target) throw new HttpError(404, 'User not found');

  const fields = {};
  if (req.body.status !== undefined) {
    if (!['active', 'blocked'].includes(req.body.status)) throw new HttpError(400, 'Status must be active or blocked');
    fields.status = req.body.status;
  }
  if (req.body.role !== undefined) {
    if (!['user', 'admin'].includes(req.body.role)) throw new HttpError(400, 'Role must be user or admin');
    fields.role = req.body.role;
  }
  if (id === req.user.id && (fields.status === 'blocked' || fields.role === 'user')) {
    throw new HttpError(400, "You can't block or demote your own account");
  }

  res.json({ user: await userModel.update(id, fields) });
});

// DELETE /api/users/:id  (admin)
const remove = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, 'user id');
  if (id === req.user.id) throw new HttpError(400, "You can't delete your own account");
  if (!(await userModel.remove(id))) throw new HttpError(404, 'User not found');
  res.status(204).end();
});

module.exports = { updateMe, list, stats, adminUpdate, remove };
