-- ============================================================================
-- MIGRATION: 20261106_security_hardening_rls_force_and_limits.sql
-- DESCRIPTION: High & Medium security hardening:
--   1. Enforces FORCE ROW LEVEL SECURITY across all 14 tables so table owners
--      and roles without BYPASSRLS are strictly subjected to tenant isolation policies.
--   2. Creates rate_limit_entries table for serverless rate limiting fallback
--      (strictly restricted to service_role with forced RLS).
--   3. Adds check constraint on message_templates to cap message_body at 2,000 characters.
--   4. Updates start_free_trial with user-level abuse protection (caps trial activations
--      to a maximum of 2 workspaces per user within 365 days).
--
-- ROLLBACK INSTRUCTIONS:
-- To rollback this migration, run the following:
--   1. ALTER TABLE public.<table_name> NO FORCE ROW LEVEL SECURITY; (for each table)
--   2. ALTER TABLE public.message_templates DROP CONSTRAINT IF EXISTS check_message_templates_body_length;
--   3. DROP TABLE IF EXISTS public.rate_limit_entries;
--   4. Re-apply start_free_trial from 20261012_trial_system.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. FORCE ROW LEVEL SECURITY ACROSS ALL 14 TABLES
-- ----------------------------------------------------------------------------

ALTER TABLE public.businesses FORCE ROW LEVEL SECURITY;
ALTER TABLE public.business_members FORCE ROW LEVEL SECURITY;
ALTER TABLE public.customers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.assets FORCE ROW LEVEL SECURITY;
ALTER TABLE public.service_types FORCE ROW LEVEL SECURITY;
ALTER TABLE public.service_records FORCE ROW LEVEL SECURITY;
ALTER TABLE public.service_schedules FORCE ROW LEVEL SECURITY;
ALTER TABLE public.reminders FORCE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE public.activities FORCE ROW LEVEL SECURITY;
ALTER TABLE public.business_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 2. DISTRIBUTED RATE LIMITING TABLE (SERVERLESS FALLBACK)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.rate_limit_entries (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE public.rate_limit_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_entries FORCE ROW LEVEL SECURITY;

-- Strictly isolate rate_limit_entries to service_role (zero client access)
REVOKE ALL ON TABLE public.rate_limit_entries FROM anon, authenticated, PUBLIC;
GRANT ALL ON TABLE public.rate_limit_entries TO service_role;

-- ----------------------------------------------------------------------------
-- 3. MESSAGE TEMPLATE BODY LENGTH CONSTRAINT (<= 2000 CHARACTERS)
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_message_templates_body_length'
  ) THEN
    ALTER TABLE public.message_templates
      ADD CONSTRAINT check_message_templates_body_length
      CHECK (length(message_body) <= 2000);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. HARDEN start_free_trial WITH USER-LEVEL TRIAL ABUSE LIMIT
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.start_free_trial(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_role TEXT;
  v_now TIMESTAMPTZ;
  v_expires TIMESTAMPTZ;
  v_sub RECORD;
  v_user_prior_trials INTEGER;
BEGIN
  -- 1. Authentication check
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED: Authentication required to start free trial.'
      USING ERRCODE = '42501';
  END IF;

  IF p_business_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: business_id is required.'
      USING ERRCODE = '22023';
  END IF;

  -- 2. Authorization check: strictly workspace 'owner'
  SELECT bm.role INTO v_role
  FROM public.business_members bm
  WHERE bm.business_id = p_business_id
    AND bm.user_id = v_caller_id;

  IF v_role IS NULL OR v_role <> 'owner' THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Only the workspace owner can activate the 14-day free trial.'
      USING ERRCODE = '42501';
  END IF;

  -- 3. Acquire advisory transaction lock to serialize concurrent trial activation requests
  PERFORM pg_advisory_xact_lock(hashtext('start_trial_' || p_business_id::text));

  -- 4. Check existing subscription / trial state for this workspace
  SELECT
    bs.id,
    bs.plan_id,
    bs.billing_type,
    bs.status,
    bs.trial_status,
    bs.trial_started_at,
    bs.trial_expires_at,
    bs.is_lifetime
  INTO v_sub
  FROM public.business_subscriptions bs
  WHERE bs.business_id = p_business_id;

  IF FOUND THEN
    -- If workspace is on an active paid plan or founding lifetime, do not overwrite
    IF v_sub.status = 'active' AND (v_sub.is_lifetime = true OR v_sub.billing_type IN ('monthly_subscription', 'lifetime_purchase')) THEN
      RAISE EXCEPTION 'ALREADY_PAID: Workspace already has an active paid subscription or lifetime license.'
        USING ERRCODE = 'P0001';
    END IF;

    -- If workspace has already started, expired, or converted a trial
    IF v_sub.trial_status IN ('active', 'expired', 'converted') OR v_sub.trial_started_at IS NOT NULL THEN
      RAISE EXCEPTION 'TRIAL_ALREADY_USED: The 14-day free trial has already been activated for this workspace.'
        USING ERRCODE = 'P0002';
    END IF;
  END IF;

  -- 5. User-level trial abuse check: prevent creating endless workspaces to farm free trials
  SELECT COUNT(*) INTO v_user_prior_trials
  FROM public.business_subscriptions
  WHERE trial_activated_by = v_caller_id
    AND trial_started_at >= (clock_timestamp() - INTERVAL '365 days')
    AND business_id <> p_business_id;

  IF v_user_prior_trials >= 2 THEN
    RAISE EXCEPTION 'TRIAL_USER_LIMIT_EXCEEDED: Your account has reached the maximum number of free trial workspaces. Please upgrade to a paid plan.'
      USING ERRCODE = 'P0003';
  END IF;

  -- 6. Calculate authoritative database timestamps
  v_now := clock_timestamp();
  v_expires := v_now + INTERVAL '14 days';

  -- 7. Upsert subscription record with active trial entitlement
  INSERT INTO public.business_subscriptions (
    business_id,
    plan_id,
    billing_type,
    status,
    max_active_customers,
    trial_status,
    trial_started_at,
    trial_expires_at,
    trial_duration_days,
    trial_activated_by,
    updated_at
  ) VALUES (
    p_business_id,
    'free_trial',
    'free_trial',
    'trialing',
    25,
    'active',
    v_now,
    v_expires,
    14,
    v_caller_id,
    v_now
  )
  ON CONFLICT (business_id) DO UPDATE SET
    plan_id = 'free_trial',
    billing_type = 'free_trial',
    status = 'trialing',
    max_active_customers = 25,
    trial_status = 'active',
    trial_started_at = v_now,
    trial_expires_at = v_expires,
    trial_duration_days = 14,
    trial_activated_by = v_caller_id,
    updated_at = v_now;

  -- 8. Audit trail activity
  INSERT INTO public.activities (
    business_id,
    actor_user_id,
    action_type,
    description
  ) VALUES (
    p_business_id,
    v_caller_id,
    'TRIAL_STARTED',
    'Activated 14-day free trial with 25 customer capacity (authoritative database activation).'
  );

  RETURN jsonb_build_object(
    'success', true,
    'business_id', p_business_id,
    'trial_status', 'active',
    'trial_started_at', v_now,
    'trial_expires_at', v_expires,
    'trial_duration_days', 14,
    'max_active_customers', 25
  );
END;
$$;
