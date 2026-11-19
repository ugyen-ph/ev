// src/services/sessionService.js
// Starting and stopping a charging session. Charging is free: no wallet, no cost.
const HttpError = require('../utils/httpError');
const withTransaction = require('../utils/transaction');
const { round2 } = require('../utils/sql');
const stationModel = require('../models/stationModel');
const sessionModel = require('../models/sessionModel');
const notificationModel = require('../models/notificationModel');
const waitlistModel = require('../models/waitlistModel');
const waitlistService = require('./waitlistService');

// TEMPORARY: reservations were removed and the QR-scan flow has not been redesigned yet, so scanning
// stays blocked (agreed). When we design scanning, change/remove this one function.
function assertScanAllowed() {
  throw new HttpError(403, 'Charging by QR scan is not available yet.');
}

// Called when the user scans the QR code and plugs in.
async function plugIn({ user, stationId }) {
  const result = await withTransaction(async (conn) => {
    const station = await stationModel.findByIdForUpdate(conn, stationId);
    if (!station) throw new HttpError(404, 'Station not found');
    if (['offline', 'locked'].includes(station.status)) {
      throw new HttpError(409, `This station is ${station.status} right now.`);
    }
    if (station.status === 'charging' && station.activeSessionId) {
      throw new HttpError(409, 'This station is already in use.');
    }
    assertScanAllowed(user, station);
    return station;
  });
  await stationModel.setPlugIn(result.id, user.id, user.name);
  return stationModel.findById(result.id);
}

async function start({ user, stationId }) {
  return withTransaction(async (conn) => {
    const station = await stationModel.findByIdForUpdate(conn, stationId);
    if (!station) throw new HttpError(404, 'Station not found');
    if (['offline', 'locked'].includes(station.status)) {
      throw new HttpError(409, `This station is ${station.status} right now.`);
    }
    if (station.status === 'charging' && station.activeSessionId) {
      throw new HttpError(409, 'This station is already in use.');
    }
    if (await sessionModel.findActiveByUser(conn, user.id)) {
      throw new HttpError(409, 'You already have an active charging session.');
    }
    assertScanAllowed(user, station);

    const session = await sessionModel.create(conn, {
      userId: user.id,
      userName: user.name,
      stationId,
      stationName: station.name,
      source: 'app',
    });
    await stationModel.setCharging(conn, stationId, session.id);
    // Starting to charge removes my place in this station's waitlist.
    await waitlistModel.removeByUserAndStation(user.id, stationId, conn);
    await notificationModel.create(
      { title: 'Charging Started', msg: `${user.name} has plugged in at ${station.name}.`, type: 'info' },
      conn
    );
    return session;
  });
}

async function stop({ sessionId, actor }) {
  const result = await withTransaction(async (conn) => {
    const session = await sessionModel.findByIdForUpdate(conn, sessionId);
    if (!session) throw new HttpError(404, 'Session not found');
    if (actor.role !== 'admin' && session.userId !== actor.id) throw new HttpError(403, 'Not your session');
    if (session.status !== 'active') throw new HttpError(409, 'This session has already ended');

    // TODO: replace with real meter values from the charger (OCPP MeterValues).
    // Until a charger reports energy, a demo amount between 5 and 25 kWh is recorded.
    const energyConsumed = round2(Math.random() * 20 + 5);

    await sessionModel.complete(conn, session.id, { energyConsumed });
    if (session.stationId) await stationModel.release(conn, session.stationId);

    await notificationModel.create(
      {
        title: 'Charging Completed',
        msg: `${session.userName} finished charging at ${session.stationName}. Energy: ${energyConsumed} kWh.`,
        type: 'success',
      },
      conn
    );
    return {
      session: await sessionModel.findById(session.id, conn),
      energyConsumed,
    };
  });

  // The charger is free now: tell the first person in line straight away (outside the transaction).
  if (result.session.stationId) {
    await waitlistService.checkStation(result.session.stationId).catch((err) =>
      console.error('[waitlist] check after stop failed:', err.message));
  }
  return result;
}

module.exports = { plugIn, start, stop };
