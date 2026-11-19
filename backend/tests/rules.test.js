// Rule tests using in-memory fakes instead of MySQL:   node --test tests/
// They check the waitlist / report / session rules in the services. They do NOT test the SQL itself.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const src = (p) => path.join(__dirname, '..', 'src', p);
const fake = (p, exports) => {
  const id = require.resolve(src(p));
  require.cache[id] = { id, filename: id, loaded: true, exports };
};

// ---- in-memory state ----
let db;
const reset = () => {
  db = {
    stations: {
      A: { id: 'A', name: 'Station A', status: 'charging', activeSessionId: 1, connectors: [] },
      B: { id: 'B', name: 'Station B', status: 'available', activeSessionId: null, connectors: [] },
    },
    waitlist: [], userNotifs: [], sysNotifs: [], reports: [], sessions: [], nextId: 1,
  };
};
reset();
const id = () => db.nextId++;
const users = { 1: 'Ann', 2: 'Ben', 3: 'Cat' };

fake('utils/transaction.js', async (fn) => fn({}));
fake('models/stationModel.js', {
  findByIdForUpdate: async (c, sid) => db.stations[sid] || null,
  findById: async (sid) => db.stations[sid] || null,
  setPlugIn: async () => {},
  setCharging: async (c, sid, sessId) => { db.stations[sid].status = 'charging'; db.stations[sid].activeSessionId = sessId; },
  release: async (c, sid) => { db.stations[sid].status = 'available'; db.stations[sid].activeSessionId = null; },
});
const view = (w) => {
  const queue = db.waitlist.filter((x) => x.stationId === w.stationId).sort((a, b) => a.id - b.id);
  return { ...w, userName: users[w.userId], stationName: db.stations[w.stationId].name, position: queue.findIndex((x) => x.id === w.id) + 1 };
};
fake('models/waitlistModel.js', {
  findByUserAndStation: async (u, s) => { const w = db.waitlist.find((x) => x.userId === u && x.stationId === s); return w ? view(w) : null; },
  add: async (c, u, s) => {
    if (db.waitlist.some((x) => x.userId === u && x.stationId === s)) throw new Error('dup'); // UNIQUE key
    const w = { id: id(), userId: u, stationId: s, joinedAt: Date.now(), notifiedAt: null }; db.waitlist.push(w); return view(w);
  },
  findById: async (i) => { const w = db.waitlist.find((x) => x.id === i); return w ? view(w) : null; },
  remove: async (i) => { db.waitlist = db.waitlist.filter((x) => x.id !== i); return true; },
  removeByUserAndStation: async (u, s) => { const n = db.waitlist.length; db.waitlist = db.waitlist.filter((x) => !(x.userId === u && x.stationId === s)); return db.waitlist.length < n; },
  findFirst: async (c, s) => { const q = db.waitlist.filter((x) => x.stationId === s).sort((a, b) => a.id - b.id); return q[0] ? view(q[0]) : null; },
  markNotified: async (c, i) => { db.waitlist.find((x) => x.id === i).notifiedAt = Date.now(); },
  resetNotified: async (c, s) => { db.waitlist.filter((x) => x.stationId === s).forEach((x) => { x.notifiedAt = null; }); },
  stationIdsWithEntries: async () => [...new Set(db.waitlist.map((x) => x.stationId))],
});
fake('models/userNotificationModel.js', { create: async (n) => { db.userNotifs.push(n); } });
fake('models/notificationModel.js', { create: async (n) => { db.sysNotifs.push(n); } });
fake('models/reportModel.js', {
  findRecent: async (c, u, s, t, since) => db.reports.find((r) => r.userId === u && r.stationId === s && r.type === t && r.createdAt > since) || null,
  create: async (c, r) => { const row = { ...r, id: id(), status: 'open', createdAt: Date.now() }; db.reports.push(row); return row; },
});
fake('models/sessionModel.js', {
  findByIdForUpdate: async (c, i) => db.sessions.find((s) => s.id === i) || null,
  findById: async (i) => db.sessions.find((s) => s.id === i) || null,
  findActiveByUser: async () => null,
  create: async (c, s) => { const row = { ...s, id: id(), status: 'active' }; db.sessions.push(row); return row; },
  complete: async (c, i, { energyConsumed }) => { const s = db.sessions.find((x) => x.id === i); s.status = 'completed'; s.energyConsumed = energyConsumed; },
});

const waitlist = require(src('services/waitlistService.js'));
const reportService = require(src('services/reportService.js'));
const sessionService = require(src('services/sessionService.js'));
const ann = { id: 1, name: 'Ann', role: 'user' };
const ben = { id: 2, name: 'Ben', role: 'user' };
const cat = { id: 3, name: 'Cat', role: 'user' };

const rejects = (p, status) => assert.rejects(p, (e) => e.statusCode === status || e.status === status);

test('cannot join the waitlist of an available station', async () => {
  reset();
  await rejects(waitlist.join({ user: ann, stationId: 'B' }), 409);
});

test('join works when busy; one entry per user per station; positions follow join order', async () => {
  reset();
  assert.equal((await waitlist.join({ user: ann, stationId: 'A' })).position, 1);
  assert.equal((await waitlist.join({ user: ben, stationId: 'A' })).position, 2);
  await rejects(waitlist.join({ user: ann, stationId: 'A' }), 409);
  assert.equal(db.waitlist.length, 2);
});

test('station free: only the FIRST person is notified, and only once', async () => {
  reset();
  await waitlist.join({ user: ann, stationId: 'A' });
  await waitlist.join({ user: ben, stationId: 'A' });
  assert.equal(await waitlist.checkStation('A'), null);          // still busy
  assert.equal(db.userNotifs.length, 0);
  db.stations.A.status = 'available'; db.stations.A.activeSessionId = null;
  const n = await waitlist.checkStation('A');
  assert.equal(n.userId, 1);
  assert.equal(db.userNotifs.length, 1);
  assert.equal(db.userNotifs[0].userId, 1);
  assert.equal(db.userNotifs[0].msg, 'Station Station A is free');
  await waitlist.checkAll(); await waitlist.checkAll();            // repeated background runs
  assert.equal(db.userNotifs.length, 1);                           // no duplicates, Ben not told
});

test('first person cancels -> next person is notified', async () => {
  reset();
  await waitlist.join({ user: ann, stationId: 'A' });
  await waitlist.join({ user: ben, stationId: 'A' });
  db.stations.A.status = 'available'; db.stations.A.activeSessionId = null;
  await waitlist.checkStation('A');
  assert.equal(await waitlist.leave({ user: ann, stationId: 'A' }), true);
  assert.deepEqual(db.userNotifs.map((n) => n.userId), [1, 2]);
  assert.equal((await require(src('models/waitlistModel.js')).findByUserAndStation(2, 'A')).position, 1);
});

test('station becomes busy again -> notified flag resets -> notified again when free', async () => {
  reset();
  await waitlist.join({ user: ann, stationId: 'A' });
  db.stations.A.status = 'available'; db.stations.A.activeSessionId = null;
  await waitlist.checkStation('A');
  assert.ok(db.waitlist[0].notifiedAt);
  db.stations.A.status = 'charging'; db.stations.A.activeSessionId = 9; // someone else took it
  await waitlist.checkStation('A');
  assert.equal(db.waitlist[0].notifiedAt, null);
  db.stations.A.status = 'available'; db.stations.A.activeSessionId = null;
  await waitlist.checkStation('A');
  assert.equal(db.userNotifs.length, 2);
});

test('offline / locked station is not "free" and does not notify', async () => {
  reset();
  await waitlist.join({ user: ann, stationId: 'A' });
  db.stations.A.status = 'offline';
  assert.equal(await waitlist.checkStation('A'), null);
  assert.equal(db.userNotifs.length, 0);
});

test('session stop frees the station and notifies the first in line immediately', async () => {
  reset();
  db.sessions.push({ id: 50, userId: 3, userName: 'Cat', stationId: 'A', stationName: 'Station A', status: 'active' });
  await waitlist.join({ user: ann, stationId: 'A' });
  await waitlist.join({ user: ben, stationId: 'A' });
  const out = await sessionService.stop({ sessionId: 50, actor: cat });
  assert.equal(db.stations.A.status, 'available');
  assert.ok(out.energyConsumed >= 5 && out.energyConsumed <= 25);
  assert.equal(out.totalCost, undefined);                          // free: no cost / credits
  assert.equal(out.credits, undefined);
  assert.deepEqual(db.userNotifs.map((n) => n.userId), [1]);
});

test('starting a session removes my waitlist entry (scan blocked for now, so test the guard)', async () => {
  reset();
  await waitlist.join({ user: ann, stationId: 'A' });
  db.stations.A.status = 'available'; db.stations.A.activeSessionId = null;
  await rejects(sessionService.start({ user: ann, stationId: 'A' }), 403); // scanning stays blocked (agreed)
  assert.equal(db.waitlist.length, 1);
});

test('admin removes an entry: user is told, next in line is notified if station is free', async () => {
  reset();
  const a = await waitlist.join({ user: ann, stationId: 'A' });
  await waitlist.join({ user: ben, stationId: 'A' });
  db.stations.A.status = 'available'; db.stations.A.activeSessionId = null;
  await waitlist.checkStation('A');
  await waitlist.adminRemove(a.id);
  assert.deepEqual(db.userNotifs.map((n) => [n.userId, n.title]), [[1, 'Station is free'], [1, 'Removed from waitlist'], [2, 'Station is free']]);
});

test('reports: saved, alerts admin feed, 1/hour per user+station+type', async () => {
  reset();
  const r = await reportService.submit({ user: ann, stationId: 'A', type: 'connector_damaged', note: 'cable cut' });
  assert.equal(r.status, 'open');
  assert.equal(db.sysNotifs.length, 1);
  assert.match(db.sysNotifs[0].msg, /Ann reported "Connector damaged" at Station A/);
  await rejects(reportService.submit({ user: ann, stationId: 'A', type: 'connector_damaged' }), 429);
  await reportService.submit({ user: ann, stationId: 'A', type: 'charger_not_working' });   // other type ok
  await reportService.submit({ user: ann, stationId: 'B', type: 'connector_damaged' });     // other station ok
  await reportService.submit({ user: ben, stationId: 'A', type: 'connector_damaged' });     // other user ok
  db.reports[0].createdAt = Date.now() - 61 * 60 * 1000;                                    // older than an hour
  await reportService.submit({ user: ann, stationId: 'A', type: 'connector_damaged' });
  assert.equal(db.reports.length, 5);
  await rejects(reportService.submit({ user: ann, stationId: 'A', type: 'nonsense' }), 400);
  await rejects(reportService.submit({ user: ann, stationId: 'ZZ', type: 'connector_damaged' }), 404);
});
