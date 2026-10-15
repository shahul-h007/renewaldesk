-- Migration: 20261015_webhook_resilience.sql
-- Description: Expand webhook_events status check constraint and provide atomic claim RPC:
--   - 'processing' (in-flight, active lock)
--   - 'completed' (fully succeeded, all writes confirmed)
--   - 'processed' (legacy succeeded compatibility)
--   - 'ignored' (test ping or unlinked payload)
--   - 'failed' (errored, permitted for safe retry)

DO $$
BEGIN
  -- 1. Drop existing status check constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'webhook_events' AND constraint_name = 'webhook_events_status_check'
  ) THEN
    ALTER TABLE public.webhook_events DROP CONSTRAINT webhook_events_status_check;
  END IF;

  -- 2. Add updated check constraint supporting full lifecycle states
  ALTER TABLE public.webhook_events ADD CONSTRAINT webhook_events_status_check
    CHECK (status IN ('processing', 'completed', 'processed', 'ignored', 'failed'));
END $$;

-- 3. Atomic Webhook Claim Function (Row-level lock to prevent concurrent duplicate worker execution)
CREATE OR REPLACE FUNCTION public.claim_webhook_event(
  p_event_id TEXT,
  p_event_type TEXT,
  p_payload JSONB,
  p_stale_seconds INT DEFAULT 60
)
RETURNS TABLE (
  claim_status TEXT, -- 'claimed', 'already_completed', 'in_flight'
  event_status TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing RECORD;
  v_stale_cutoff TIMESTAMPTZ := clock_timestamp() - (p_stale_seconds || ' seconds')::INTERVAL;
BEGIN
  -- Attempt initial insert
  BEGIN
    INSERT INTO public.webhook_events (event_id, event_type, payload, status, processed_at)
    VALUES (p_event_id, p_event_type, p_payload, 'processing', clock_timestamp());

    RETURN QUERY SELECT 'claimed'::TEXT, 'processing'::TEXT, NULL::TEXT;
    RETURN;
  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;

  -- Row already exists: acquire exclusive row lock
  SELECT * INTO v_existing
  FROM public.webhook_events
  WHERE event_id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'in_flight'::TEXT, 'processing'::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- If already finished or ignored, do not reprocess
  IF v_existing.status IN ('completed', 'processed', 'ignored') THEN
    RETURN QUERY SELECT 'already_completed'::TEXT, v_existing.status, v_existing.error_message;
    RETURN;
  END IF;

  -- If currently processing and within the active window (< 60s), reject concurrent worker
  IF v_existing.status = 'processing' AND v_existing.processed_at >= v_stale_cutoff THEN
    RETURN QUERY SELECT 'in_flight'::TEXT, 'processing'::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Reclaim failed or stale event
  UPDATE public.webhook_events
  SET status = 'processing',
      processed_at = clock_timestamp(),
      error_message = NULL,
      payload = COALESCE(p_payload, v_existing.payload)
  WHERE event_id = p_event_id;

  RETURN QUERY SELECT 'claimed'::TEXT, 'processing'::TEXT, NULL::TEXT;
  RETURN;
END;
$$;

-- Restrict execute privileges strictly to service_role
REVOKE ALL ON FUNCTION public.claim_webhook_event(TEXT, TEXT, JSONB, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_webhook_event(TEXT, TEXT, JSONB, INT) TO service_role;
