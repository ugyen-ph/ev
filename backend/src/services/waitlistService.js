// src/services/waitlistService.js
// Waitlist rules: one entry per user per station, strict first-joined order,
// only the first person in line is told when the station is free.
const HttpError = require('../utils/httpError');
const withTransaction = require('../utils/transaction');
const stationModel = require('../models/stationModel');
const waitlistModel = require('../models/waitlistModel');
const userNotificationModel = require('../models/userNotificationModel');

// A station is "busy" while someone is plugged in / charging. Only then can you join the waitlist.
const BUSY = ['charging', 'occupied', 'plug_in'];

async function join({ user, stationId }) {
  return withTransaction(async (conn) => {
    const station = await stationModel.findByIdForUpdate(conn, stationId); // serialises joins per station
    if (!station) throw new HttpError(404, 'Station not found');
    if (!BUSY.includes(station.status)) {
      throw new HttpError(409, 'This station is not busy right now, so there is no waitlist to join.');
    }
    if (await waitlistModel.findByUserAndStation(user.id, stationId, conn)) {
      throw new HttpError(409, 'You are already on the waitlist for this station.');
    }
    return waitlistModel.add(conn, user.id, stationId);
  });
}

// The user leaves their own place in line. Returns true if they were on the list.
async function leave({ user, stationId }) {
  const removed = await waitlistModel.removeByUserAndStation(user.id, stationId);
  if (removed) await checkStation(stationId); // the next person may now be first in line
  return removed;
}

// Admin removes someone from the line; the removed user gets a note in their inbox.
async function adminRemove(entryId) {
  const entry = await waitlistModel.findById(entryId);
  if (!entry) throw new HttpError(404, 'Waitlist entry not found');
  await withTransaction(async (conn) => {
    await waitlistModel.remove(entryId, conn);
    await userNotificationModel.create({
      userId: entry.userId,
      title: 'Removed from waitlist',
      msg: `An admin removed you from the waitlist for ${entry.stationName}.`,
      type: 'info',
    }, conn);
  });
  await checkStation(entry.stationId);
  return entry;
}

// Called by the background job, and straight away after a session stops or an admin changes a station.
//  - station busy              -> clear "notified" flags so the next free moment notifies again
//  - station free + first in line not yet notified -> notify only that person
// Returns the entry that was notified (or null).
async function checkStation(stationId) {
  return withTransaction(async (conn) => {
    const station = await stationModel.findByIdForUpdate(conn, stationId);
    if (!station) return null;

    if (BUSY.includes(station.status)) {
      await waitlistModel.resetNotified(conn, stationId);
      return null;
    }
    if (station.status !== 'available' || station.activeSessionId) return null; // offline / locked: not free

    const first = await waitlistModel.findFirst(conn, stationId);
    if (!first || first.notifiedAt) return null;

    await waitlistModel.markNotified(conn, first.id);
    await userNotificationModel.create({
      userId: first.userId,
      title: 'Station is free',
      msg: `Station ${station.name} is free`,
      type: 'success',
    }, conn);
    return first;
  });
}

// Check every station that has someone waiting.
async function checkAll() {
  const ids = await waitlistModel.stationIdsWithEntries();
  const notified = [];
  for (const id of ids) {
    try {
      const n = await checkStation(id);
      if (n) notified.push(n);
    } catch (err) {
      console.error(`[waitlist] check failed for ${id}:`, err.message);
    }
  }
  return notified;
}

module.exports = { BUSY, join, leave, adminRemove, checkStation, checkAll };
