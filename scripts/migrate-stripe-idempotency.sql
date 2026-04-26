-- ============================================================
-- Run in Supabase → SQL Editor
-- Creates the idempotency table for Stripe webhook events
-- ============================================================

CREATE TABLE IF NOT EXISTS processed_stripe_events (
  event_id     TEXT PRIMARY KEY,
  event_type   TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only the service role should write to this table
ALTER TABLE processed_stripe_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to processed_stripe_events"
  ON processed_stripe_events FOR ALL
  USING (true)
  WITH CHECK (true);

-- Optional: auto-purge events older than 30 days to keep the table lean
-- (Stripe's retry window is 3 days, so 30 days is well beyond safe)
-- You can run this manually or set up a pg_cron job:
-- DELETE FROM processed_stripe_events WHERE processed_at < NOW() - INTERVAL '30 days';
