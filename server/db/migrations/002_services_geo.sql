ALTER TABLE stations ADD COLUMN IF NOT EXISTS service_category TEXT NOT NULL DEFAULT 'charging';

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS check_in_at BIGINT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS last_driver_lat DOUBLE PRECISION;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS last_driver_lng DOUBLE PRECISION;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS last_location_at BIGINT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dwell_exceeded BOOLEAN NOT NULL DEFAULT false;

UPDATE stations SET service_category = 'charging' WHERE service_category IS NULL OR service_category = '';

CREATE INDEX IF NOT EXISTS idx_stations_category ON stations(service_category);
