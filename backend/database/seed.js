// Loads the 14 Bhutanese stations and creates the first admin account.
// Usage: npm run db:seed        (safe to run again: stations are upserted, admin is created only once)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mysql2 = require('mysql2/promise');
const dbConfig = require('../src/config/dbConfig');
const config = require('../src/config');

(async () => {
  const conn = await mysql2.createConnection(dbConfig);
  try {
    const stations = JSON.parse(fs.readFileSync(path.join(__dirname, 'stations.seed.json'), 'utf8'));
    const now = Date.now();

    for (const s of stations) {
      await conn.execute(
        `INSERT INTO stations (id, name, address, lat, lng, status, rating, amenities, last_updated, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), address = VALUES(address), lat = VALUES(lat),
           lng = VALUES(lng), rating = VALUES(rating), amenities = VALUES(amenities)`,
        [s.id, s.name, s.location.address, s.location.lat, s.location.lng, s.status || 'available',
         s.rating || 0, JSON.stringify(s.amenities || []), now, now]
      );
      for (const c of s.connectors || []) {
        await conn.execute(
          `INSERT INTO connectors (station_id, code, type, power, status, price)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE type = VALUES(type), power = VALUES(power), price = VALUES(price)`,
          [s.id, c.id, c.type, c.power || null, c.status || 'available', c.price || null]
        );
      }
    }
    console.log(`Stations seeded: ${stations.length}`);

    const email = (process.env.ADMIN_EMAIL || 'admin@evhub.com').toLowerCase();
    const [existing] = await conn.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      console.log(`Admin ${email} already exists - left unchanged.`);
    } else {
      let password = process.env.ADMIN_PASSWORD;
      let generated = false;
      if (!password) { password = crypto.randomBytes(9).toString('base64url'); generated = true; }
      const hash = await bcrypt.hash(password, config.bcryptRounds);
      await conn.execute(
        `INSERT INTO users (name, email, password_hash, role, status, is_verified, created_at)
         VALUES (?, ?, ?, 'admin', 'active', 1, ?)`,
        [process.env.ADMIN_NAME || 'EV Hub Admin', email, hash, now]
      );
      console.log(`Admin created: ${email}`);
      if (generated) console.log(`Generated password (shown once, change it in Settings): ${password}`);
    }
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.code || '', err.message);
    process.exit(1);
  } finally {
    await conn.end().catch(() => {});
  }
})();
