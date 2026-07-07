-- OTP profiles, tender details, driver counter-offers

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS problem_description TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS notify_radius_km INTEGER DEFAULT 50;

ALTER TABLE service_bids ADD COLUMN IF NOT EXISTS driver_counter_total NUMERIC;
ALTER TABLE service_bids ADD COLUMN IF NOT EXISTS driver_counter_eta_minutes INTEGER;
ALTER TABLE service_bids ADD COLUMN IF NOT EXISTS driver_counter_message TEXT;
ALTER TABLE service_bids ADD COLUMN IF NOT EXISTS driver_counter_at BIGINT;
