-- Three-party tender confirmation + provider upgrade + redistribute blacklist

ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_capable BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS client_confirmed_at BIGINT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS provider_confirmed_at BIGINT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS platform_confirmed_at BIGINT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS excluded_host_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
