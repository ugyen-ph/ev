// src/jobs/waitlistJob.js
// Every few seconds: for each station that has people waiting, notify the first person in line
// if the station is free (and reset the "notified" flags if it became busy again).
const config = require('../config');
const waitlistService = require('../services/waitlistService');

let running = false; // never let two runs overlap

async function runOnce() {
  if (running) return [];
  running = true;
  try {
    const notified = await waitlistService.checkAll();
    for (const n of notified) console.log(`[waitlist] ${n.userName} notified: ${n.stationName} is free`);
    return notified;
  } finally {
    running = false;
  }
}

function start() {
  if (!config.waitlistJobEnabled) {
    console.log('[waitlist] background check disabled (WAITLIST_JOB=off)');
    return null;
  }
  const timer = setInterval(() => {
    runOnce().catch((err) => console.error('[waitlist] run failed:', err.message));
  }, config.waitlistCheckSeconds * 1000);
  timer.unref();
  console.log(`[waitlist] checking every ${config.waitlistCheckSeconds}s`);
  return timer;
}

module.exports = { start, runOnce };
