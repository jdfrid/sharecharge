-- Emergency service requests (tender) + provider bids

CREATE TABLE IF NOT EXISTS service_requests (
  id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL REFERENCES users(id),
  category TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  address_text TEXT,
  vehicle_profile JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'open',
  accepted_bid_id TEXT,
  host_id TEXT REFERENCES users(id),
  amount NUMERIC DEFAULT 0,
  provider_lat DOUBLE PRECISION,
  provider_lng DOUBLE PRECISION,
  expires_at BIGINT,
  created_at BIGINT NOT NULL,
  completed_at BIGINT
);

CREATE TABLE IF NOT EXISTS service_bids (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  host_id TEXT NOT NULL REFERENCES users(id),
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total NUMERIC NOT NULL,
  eta_minutes INTEGER NOT NULL DEFAULT 15,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_bids_request ON service_bids(request_id);
