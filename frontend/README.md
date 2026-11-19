# EV Hub – Frontend (user app + admin dashboard)

Both apps now talk to the **EV Hub backend** (Node/Express/MySQL, JWT login). Firebase has been removed.

| App | Folder | Dev URL |
|---|---|---|
| User app | `/` (root) | http://localhost:5173 |
| Admin dashboard | `/admin` | http://localhost:5177 |

## Run

1. Start the backend first (see its README): `http://localhost:3000`
2. Install and configure each app:
   ```bash
   npm install && cp .env.example .env          # user app (root)
   cd admin && npm install && cp .env.example .env
   ```
3. Start them: `npm run dev:user` (root) and `npm run dev` (inside `admin/`).

`VITE_API_URL` in each `.env` points at the backend (default `http://localhost:3000/api`).
Add both app URLs to `CORS_ORIGINS` in the backend `.env`.

## Sign-in
- Users sign up in the user app.
- Admins sign in on the admin dashboard with the account created by the backend's `npm run db:seed`.
- Live data refreshes every 5 seconds (polling).

> `client/` is an older copy of the user app and still references Firebase; it is not used.
> `npm run dev:server` expects the OCPP simulator in `server/`, which is not part of this repo (the apps work without it).
