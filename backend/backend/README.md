# EV Hub Backend

Node.js + Express + MySQL API for the EV Hub apps (user app and admin dashboard).
Structure: **MVC** (`routes → controllers → models`) plus a small `services/` layer for the multi-step business rules (waitlist, reports, charging sessions).
Authentication: **bcrypt**-hashed passwords and **JWT** tokens. Firebase is no longer used.

## Quick start

```bash
npm install
cp .env.example .env        # then fill in DB_* and a long random JWT_SECRET
npm run test:db             # checks the MySQL connection
npm run db:init             # creates the tables (database/schema.sql)
npm run db:seed             # loads the 14 stations + creates the admin account
npm run dev                 # http://localhost:3000   (npm start in production)
```

`db:seed` prints the admin password once if you did not set `ADMIN_PASSWORD`. The admin signs in on the admin dashboard.
The seed can be run again safely: stations are updated, the admin is only created once.

## Folder layout

```
server.js                    app setup (helmet, CORS, JSON, routes, error handler)
database/schema.sql          tables           database/init.js   applies the schema
database/seed.js             stations + admin database/stations.seed.json
src/config/                  env settings + DB connection settings
src/db.js                    MySQL pool
src/routes/                  URL → controller (and who may call it)
src/controllers/             validate input, send the response
src/services/                waitlist, report + charging rules (transactions)
src/models/                  all SQL lives here
src/middleware/              JWT auth, admin check, errors, rate limit
src/jobs/waitlistJob.js      every few seconds: notifies the first person in line when a station is free
tests/rules.test.js          npm test - waitlist/report rules against in-memory fakes (no database needed)
```

## Waitlist and reports (replaces reservations)

Charging is free. There are no reservations, wallet or fees.

- **Waitlist**: you can only join a station that is busy (`charging`, `occupied`, `plug_in`). One entry per user per station; position is strict join order.
- **Notification**: when the station becomes `available`, only the first person in line gets an inbox message ("Station X is free"). The server checks every `WAITLIST_CHECK_SECONDS` (default 5) and also straight after a session stops or an admin changes a station's status. If the station becomes busy again, the "notified" flags reset. No hold timers: if the first person does not come they cancel and the next one is notified.
- **Reports**: types `charger_not_working`, `connector_damaged`, `station_blocked`, `still_plugged_in`. One per user + station + type per hour. Every report also adds an alert to the admin notification feed. Open reports from the last 24 hours are shown on the station (type and time only, never the reporter).
- **Scanning is still blocked** (`assertScanAllowed` in `sessionService.js`) until the QR flow is redesigned.
- Connector `price` stays in the database for a future pay-per-use plan; the apps show "Free".

## API

All routes are under `/api`. Send `Authorization: Bearer <token>` except where marked *public*. Errors are `{ "error": "message" }`.

| Method & path | Who | What |
|---|---|---|
| `POST /auth/register` | public | `{name, email, password, phone?, vehicle?}` → `{token, user}` (always role `user`) |
| `POST /auth/login` | public | `{email, password}` → `{token, user}` |
| `POST /auth/forgot-password` | public | `{email}`. Code is printed in the server console; outside production it is also returned as `resetToken` |
| `POST /auth/reset-password` | public | `{token, password}` |
| `GET /auth/me`, `POST /auth/logout` | user | current user / mark offline |
| `PATCH /users/me` | user | `{name?, phone?, vehicle?, newPassword?, currentPassword?}` |
| `GET /users`, `GET /users/stats` | admin | all users / `{registeredUsers, onlineUsers}` |
| `PATCH /users/:id`, `DELETE /users/:id` | admin | block/unblock, role / delete |
| `GET /stations`, `GET /stations/:id` | user | stations with connectors |
| `POST /stations`, `PUT /stations/:id`, `DELETE /stations/:id` | admin | manage chargers |
| `PATCH /stations/:id/status` | admin | remote override |
| `POST /stations/:id/plug-in` | user | after QR scan (currently always refused, see above) |
| `GET /waitlist/mine` | user | my waitlist entries with position |
| `POST /waitlist` | user | `{stationId}` join (only when the station is busy) |
| `DELETE /waitlist/station/:stationId` | user | leave the waitlist |
| `GET /waitlist`, `DELETE /waitlist/:id` | admin | everyone waiting / remove an entry |
| `POST /reports`, `GET /reports/mine` | user | `{stationId, type, note?}` / my reports |
| `GET /reports`, `PATCH /reports/:id/status` | admin | all reports / `{status}: open or resolved` |
| `GET /notifications/mine`, `POST /notifications/mine/read-all` | user | my inbox (the bell) |
| `GET /sessions` | user | own sessions (admin: all) |
| `POST /sessions` | user | `{stationId}` start charging |
| `POST /sessions/:id/stop` | owner/admin | → `{session, energyConsumed}` |
| `GET/POST/PATCH/DELETE /notifications`, `POST /notifications/read-all` | admin | admin notification feed |
| `GET/POST/DELETE /ocpp-logs` | admin | OCPP event log; `DELETE ?status=Faulted[&stationId=]` clears faults |

## Things to know before production

- **Energy is simulated.** `sessionService.stop` records a random 5–25 kWh (as the old app did) until chargers report real meter values over OCPP. Search for `TODO` in `src/services/sessionService.js`.
- **Reset codes are not emailed yet.** Wire an email/SMS provider into `forgotPassword` in `authController.js`.
- **Set `JWT_SECRET`** (the server refuses to start in production without it) and set `CORS_ORIGINS` to your real frontend URLs.
- Behind a proxy / load balancer, set `TRUST_PROXY=1` so rate limiting sees real client IPs.
- Login attempts are rate limited (40 per 15 minutes per IP on the auth routes).
