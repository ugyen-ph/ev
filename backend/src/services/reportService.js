// src/services/reportService.js
const config = require('../config');
const HttpError = require('../utils/httpError');
const withTransaction = require('../utils/transaction');
const stationModel = require('../models/stationModel');
const reportModel = require('../models/reportModel');
const notificationModel = require('../models/notificationModel');

const TYPES = {
  charger_not_working: 'Charger not working',
  connector_damaged: 'Connector damaged',
  station_blocked: 'Station blocked by another vehicle',
  still_plugged_in: 'Someone still plugged in',
};

async function submit({ user, stationId, type, note }) {
  if (!TYPES[type]) throw new HttpError(400, 'Please choose a valid problem type');
  return withTransaction(async (conn) => {
    const station = await stationModel.findByIdForUpdate(conn, stationId);
    if (!station) throw new HttpError(404, 'Station not found');

    // The station row lock above also makes this check safe against double-clicks.
    const recent = await reportModel.findRecent(conn, user.id, stationId, type, Date.now() - config.reportCooldownMs);
    if (recent) {
      throw new HttpError(429, 'You already reported this problem for this station in the last hour.');
    }

    const report = await reportModel.create(conn, { userId: user.id, stationId, type, note });
    await notificationModel.create({
      title: 'New Report',
      msg: `${user.name} reported "${TYPES[type]}" at ${station.name}.`,
      type: 'alert',
    }, conn);
    return report;
  });
}

module.exports = { TYPES, submit };
