-- EV Hub database schema (MySQL 8 / Aiven MySQL)
-- Run with:  npm run db:init      (or paste into MySQL Workbench with SSL = Require)
-- Times are stored as BIGINT milliseconds since the Unix epoch, matching the frontend's Date.now().

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(190)  NOT NULL,
  password_hash VARCHAR(100)  NOT NULL,
  phone         VARCHAR(30)   NULL,
  vehicle       VARCHAR(100)  NULL,
  role          ENUM('user','admin')    NOT NULL DEFAULT 'user',
  status        ENUM('active','blocked') NOT NULL DEFAULT 'active',
  is_verified   TINYINT(1)   NOT NULL DEFAULT 0,
  verify_token_hash CHAR(64) NULL,
  verify_token_expires_at BIGINT NULL,
  last_seen     BIGINT        NULL,
  created_at    BIGINT        NOT NULL,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS password_resets (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT      NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at BIGINT   NOT NULL,
  used       TINYINT(1) NOT NULL DEFAULT 0,
  created_at BIGINT   NOT NULL,
  KEY idx_resets_token (token_hash),
  CONSTRAINT fk_resets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS stations (
  id                VARCHAR(20)  PRIMARY KEY,           -- e.g. 'st-001'
  name              VARCHAR(150) NOT NULL,
  address           VARCHAR(255) NOT NULL,
  lat               DECIMAL(9,6) NULL,
  lng               DECIMAL(9,6) NULL,
  status            VARCHAR(20)  NOT NULL DEFAULT 'available',
  rating            DECIMAL(2,1) NOT NULL DEFAULT 0,
  amenities         JSON         NULL,
  plug_in_user_id   INT          NULL,
  plug_in_user_name VARCHAR(100) NULL,
  active_session_id INT          NULL,
  last_updated      BIGINT       NOT NULL,
  created_at        BIGINT       NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS connectors (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  station_id VARCHAR(20) NOT NULL,
  code       VARCHAR(10) NOT NULL,                      -- 'c1', 'c2', ...
  type       VARCHAR(60) NOT NULL,
  power      VARCHAR(20) NULL,                          -- '50kW'
  status     VARCHAR(20) NOT NULL DEFAULT 'available',
  price      VARCHAR(40) NULL,                          -- kept for future pay-per-use; the app shows "Free" for now
  UNIQUE KEY uq_connector (station_id, code),
  CONSTRAINT fk_connectors_station FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sessions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT          NOT NULL,
  user_name       VARCHAR(100) NOT NULL,
  station_id      VARCHAR(20)  NULL,
  station_name    VARCHAR(150) NOT NULL,
  status          VARCHAR(20)  NOT NULL DEFAULT 'active',  -- active|completed
  energy_consumed DECIMAL(10,2) NOT NULL DEFAULT 0,        -- kWh
  source          VARCHAR(30)  NOT NULL DEFAULT 'app',
  start_time      BIGINT       NOT NULL,
  end_time        BIGINT       NULL,
  created_at      BIGINT       NOT NULL,
  KEY idx_sessions_user (user_id, status),
  KEY idx_sessions_station (station_id),
  CONSTRAINT fk_sessions_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_sessions_station FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS system_notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  title      VARCHAR(150) NOT NULL,
  msg        VARCHAR(500) NOT NULL,
  type       VARCHAR(20)  NOT NULL DEFAULT 'info',      -- info|success|alert|error
  is_read    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at BIGINT       NOT NULL,
  KEY idx_notifications_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ocpp_logs (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  station_id VARCHAR(20) NOT NULL,
  action     VARCHAR(50) NOT NULL,                      -- e.g. StatusNotification
  payload    JSON        NULL,
  created_at BIGINT      NOT NULL,
  KEY idx_ocpp_created (created_at),
  KEY idx_ocpp_station (station_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Waitlist: one row per user per station. Position = order of id (strict first-joined order).
-- notified_at is set when the user was told the station is free; it is cleared if the station becomes busy again.
CREATE TABLE IF NOT EXISTS waitlist (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT         NOT NULL,
  station_id  VARCHAR(20) NOT NULL,
  joined_at   BIGINT      NOT NULL,
  notified_at BIGINT      NULL,
  UNIQUE KEY uq_waitlist_user_station (user_id, station_id),
  KEY idx_waitlist_station (station_id, id),
  CONSTRAINT fk_waitlist_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_waitlist_station FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Inbox for the user app's bell (separate from the admin-only system_notifications feed).
CREATE TABLE IF NOT EXISTS user_notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT          NOT NULL,
  title      VARCHAR(150) NOT NULL,
  msg        VARCHAR(500) NOT NULL,
  type       VARCHAR(20)  NOT NULL DEFAULT 'info',
  is_read    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at BIGINT       NOT NULL,
  KEY idx_user_notifications (user_id, created_at),
  CONSTRAINT fk_user_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reports (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT         NOT NULL,
  station_id  VARCHAR(20) NOT NULL,
  type        VARCHAR(30) NOT NULL,   -- charger_not_working|connector_damaged|station_blocked|still_plugged_in
  note        VARCHAR(500) NULL,
  status      VARCHAR(10) NOT NULL DEFAULT 'open',   -- open|resolved
  created_at  BIGINT      NOT NULL,
  resolved_at BIGINT      NULL,
  KEY idx_reports_limit (user_id, station_id, type, created_at),
  KEY idx_reports_station (station_id, status, created_at),
  CONSTRAINT fk_reports_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_reports_station FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
