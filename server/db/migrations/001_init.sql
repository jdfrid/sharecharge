CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('driver', 'host', 'admin')),
  verified BOOLEAN NOT NULL DEFAULT true,
  blocked BOOLEAN NOT NULL DEFAULT false,
  revenue NUMERIC(12, 2) NOT NULL DEFAULT 0,
  spend NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE TABLE IF NOT EXISTS stations (
  id TEXT PRIMARY KEY,
  host_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL DEFAULT 32.08,
  lng DOUBLE PRECISION NOT NULL DEFAULT 34.78,
  distance DOUBLE PRECISION NOT NULL DEFAULT 1,
  power NUMERIC(8, 2) NOT NULL DEFAULT 11,
  plug TEXT NOT NULL DEFAULT 'Type 2',
  price_per_kwh NUMERIC(8, 2) NOT NULL DEFAULT 1.25,
  available BOOLEAN NOT NULL DEFAULT true,
  rating NUMERIC(3, 1) NOT NULL DEFAULT 5,
  photos INT NOT NULL DEFAULT 0,
  terms_text TEXT NOT NULL DEFAULT '',
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  station_id TEXT NOT NULL REFERENCES stations(id),
  driver_id TEXT NOT NULL REFERENCES users(id),
  driver_email_snapshot TEXT NOT NULL DEFAULT '',
  host_id TEXT NOT NULL REFERENCES users(id),
  start_time TEXT NOT NULL,
  duration_hours INT NOT NULL DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'pending',
  otp TEXT NOT NULL DEFAULT '',
  otp_expires_at BIGINT,
  kwh NUMERIC(10, 2) NOT NULL DEFAULT 0,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  host_share NUMERIC(12, 2) NOT NULL DEFAULT 0,
  platform_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  driver_confirmed_start BOOLEAN NOT NULL DEFAULT false,
  host_confirmed_connection BOOLEAN NOT NULL DEFAULT false,
  notes JSONB NOT NULL DEFAULT '[]',
  created_at BIGINT NOT NULL,
  approved_at BIGINT,
  rejected_at BIGINT,
  on_way_at BIGINT,
  otp_verified_at BIGINT,
  started_at BIGINT,
  completed_at BIGINT
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  station_id TEXT NOT NULL REFERENCES stations(id),
  driver_id TEXT NOT NULL REFERENCES users(id),
  host_id TEXT NOT NULL REFERENCES users(id),
  amount NUMERIC(12, 2) NOT NULL,
  host_share NUMERIC(12, 2) NOT NULL,
  platform_fee NUMERIC(12, 2) NOT NULL,
  kwh NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid_mock',
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at BIGINT NOT NULL,
  resolved_at BIGINT
);

CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  commission NUMERIC(6, 2) NOT NULL DEFAULT 12.5,
  cancellation_fee NUMERIC(12, 2) NOT NULL DEFAULT 15,
  otp_window_minutes INT NOT NULL DEFAULT 15
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'activity',
  time BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_otps (
  email TEXT NOT NULL,
  portal TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  PRIMARY KEY (email, portal)
);

CREATE INDEX IF NOT EXISTS idx_bookings_driver ON bookings(driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_host ON bookings(host_id);
CREATE INDEX IF NOT EXISTS idx_stations_host ON stations(host_id);

INSERT INTO settings (id, commission, cancellation_fee, otp_window_minutes)
VALUES (1, 12.5, 15, 15)
ON CONFLICT (id) DO NOTHING;
