CREATE TABLE IF NOT EXISTS payment_methods (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  provider TEXT NOT NULL DEFAULT 'tranzila',
  token TEXT NOT NULL,
  card_last4 TEXT NOT NULL,
  card_brand TEXT NOT NULL DEFAULT 'visa',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  reference_type TEXT NOT NULL CHECK (reference_type IN ('booking', 'tender', 'manual')),
  reference_id TEXT,
  payer_id TEXT NOT NULL REFERENCES users(id),
  host_id TEXT REFERENCES users(id),
  title TEXT NOT NULL DEFAULT '',
  amount NUMERIC(12, 2) NOT NULL,
  platform_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  host_share NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ILS',
  status TEXT NOT NULL DEFAULT 'pending',
  gateway TEXT NOT NULL DEFAULT 'tranzila',
  gateway_txn_id TEXT,
  created_at BIGINT NOT NULL,
  paid_at BIGINT
);

CREATE TABLE IF NOT EXISTS payment_splits (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  split_type TEXT NOT NULL CHECK (split_type IN ('card_charge', 'platform', 'host_payout')),
  recipient_id TEXT,
  card_last4 TEXT,
  card_brand TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  gateway_txn_id TEXT,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_payer ON payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_payments_host ON payments(host_id);
CREATE INDEX IF NOT EXISTS idx_payment_splits_payment ON payment_splits(payment_id);

ALTER TABLE transactions ALTER COLUMN booking_id DROP NOT NULL;
