-- Migration: 20261015_webhook_resilience.sql
-- Description: Expand webhook_events status check constraint to support explicit lifecycle states:
--   - 'processing' (in-flight, active lock)
--   - 'completed' (fully succeeded, all writes confirmed)
--   - 'processed' (legacy succeeded compatibility)
--   - 'ignored' (test ping or unlinked payload)
--   - 'failed' (errored, permitted for safe retry)

DO $$
BEGIN
  -- Drop existing status check constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'webhook_events' AND constraint_name = 'webhook_events_status_check'
  ) THEN
    ALTER TABLE public.webhook_events DROP CONSTRAINT webhook_events_status_check;
  END IF;

  -- Add updated check constraint supporting full lifecycle states
  ALTER TABLE public.webhook_events ADD CONSTRAINT webhook_events_status_check
    CHECK (status IN ('processing', 'completed', 'processed', 'ignored', 'failed'));
END $$;
