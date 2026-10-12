-- ==============================================================================
-- RenewalDesk Migration: 14-Day Free Trial System & Entitlement Governance
-- Migration: 20261012_trial_system.sql
-- ==============================================================================

-- 1. EXTEND BUSINESS_SUBSCRIPTIONS SCHEMA FOR EXPLICIT TRIAL TRACKING
DO $$
BEGIN
  -- Add trial_status column if it does not exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'business_subscriptions'
      AND column_name = 'trial_status'
  ) THEN
    ALTER TABLE public.business_subscriptions
      ADD COLUMN trial_status TEXT CHECK (trial_status IN ('not_started', 'active', 'expired', 'converted')) DEFAULT 'not_started';
  END IF;

  -- Add trial_started_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'business_subscriptions'
      AND column_name = 'trial_started_at'
  ) THEN
    ALTER TABLE public.business_subscriptions
      ADD COLUMN trial_started_at TIMESTAMPTZ;
  END IF;

  -- Add trial_expires_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'business_subscriptions'
      AND column_name = 'trial_expires_at'
  ) THEN
    ALTER TABLE public.business_subscriptions
      ADD COLUMN trial_expires_at TIMESTAMPTZ;
  END IF;

  -- Add trial_duration_days column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'business_subscriptions'
      AND column_name = 'trial_duration_days'
  ) THEN
    ALTER TABLE public.business_subscriptions
      ADD COLUMN trial_duration_days INTEGER NOT NULL DEFAULT 14;
  END IF;

  -- Add trial_activated_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'business_subscriptions'
      AND column_name = 'trial_activated_by'
  ) THEN
    ALTER TABLE public.business_subscriptions
      ADD COLUMN trial_activated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Indexes for efficient trial lookup and expiration sweeps
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_status
  ON public.business_subscriptions(trial_status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_expires_at
  ON public.business_subscriptions(trial_expires_at);

-- 2. ATOMIC RPC FUNCTION: START 14-DAY FREE TRIAL
-- Ensures only verified workspace owners can activate, locks workspace against concurrency,
-- and guarantees an authoritative 14-day duration from database now().
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

  -- 4. Check existing subscription / trial state
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

  -- 5. Calculate authoritative database timestamps
  v_now := clock_timestamp();
  v_expires := v_now + INTERVAL '14 days';

  -- 6. Upsert subscription record with active trial entitlement
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

  -- 7. Audit log in activities
  BEGIN
    INSERT INTO public.activities (
      business_id,
      actor_user_id,
      action_type,
      description,
      metadata
    ) VALUES (
      p_business_id,
      v_caller_id,
      'TRIAL_STARTED',
      format('Activated 14-day free trial with 25 active customer limit (expires %s)', to_char(v_expires, 'YYYY-MM-DD HH24:MI:SS TZ')),
      jsonb_build_object(
        'trial_started_at', v_now,
        'trial_expires_at', v_expires,
        'duration_days', 14,
        'max_active_customers', 25
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ACTIVITIES_LOG_FAILED: %', SQLERRM;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'business_id', p_business_id,
    'plan_id', 'free_trial',
    'trial_status', 'active',
    'trial_started_at', v_now,
    'trial_expires_at', v_expires,
    'trial_duration_days', 14,
    'max_active_customers', 25
  );
END;
$$;

REVOKE ALL ON FUNCTION public.start_free_trial(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_free_trial(UUID) TO authenticated, service_role;

-- 3. UPDATED CHECK_CUSTOMER_CAPACITY FUNCTION
-- Enforces:
-- 1. If trial not started: 0 capacity allowed; block customer additions.
-- 2. If trial active and within 14 days: capacity up to 25 active customers.
-- 3. If trial expired (now() >= trial_expires_at): 0 additions allowed; marks expired.
-- 4. If paid/lifetime: enforces paid customer limit.
CREATE OR REPLACE FUNCTION public.check_customer_capacity(
  p_business_id UUID,
  p_incoming_count INTEGER DEFAULT 1
)
RETURNS TABLE (
  allowed BOOLEAN,
  current_active_count INTEGER,
  max_capacity INTEGER,
  remaining_capacity INTEGER,
  plan_id TEXT,
  is_lifetime BOOLEAN,
  trial_status TEXT,
  trial_expires_at TIMESTAMPTZ,
  is_trial_expired BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sub RECORD;
  v_current_count INTEGER;
  v_limit INTEGER;
  v_plan TEXT;
  v_lifetime BOOLEAN;
  v_trial_status TEXT;
  v_trial_expires TIMESTAMPTZ;
  v_is_expired BOOLEAN;
  v_allowed BOOLEAN;
  v_remaining INTEGER;
BEGIN
  -- 1. Find subscription for workspace
  SELECT
    bs.plan_id,
    bs.billing_type,
    bs.max_active_customers,
    bs.is_lifetime,
    bs.status,
    bs.trial_status,
    bs.trial_started_at,
    bs.trial_expires_at
  INTO v_sub
  FROM public.business_subscriptions bs
  WHERE bs.business_id = p_business_id;

  -- 2. Determine entitlement state
  IF NOT FOUND THEN
    -- Workspace has not started trial
    v_limit := 0;
    v_plan := 'not_started';
    v_lifetime := false;
    v_trial_status := 'not_started';
    v_trial_expires := NULL;
    v_is_expired := false;
  ELSIF v_sub.status = 'active' AND (v_sub.is_lifetime = true OR v_sub.billing_type IN ('monthly_subscription', 'lifetime_purchase')) THEN
    -- Active paid or lifetime plan
    v_limit := v_sub.max_active_customers;
    v_plan := v_sub.plan_id;
    v_lifetime := v_sub.is_lifetime;
    v_trial_status := COALESCE(v_sub.trial_status, 'converted');
    v_trial_expires := v_sub.trial_expires_at;
    v_is_expired := false;
  ELSIF v_sub.trial_status = 'not_started' THEN
    -- Explicit unstarted trial
    v_limit := 0;
    v_plan := 'not_started';
    v_lifetime := false;
    v_trial_status := 'not_started';
    v_trial_expires := NULL;
    v_is_expired := false;
  ELSIF v_sub.trial_status = 'expired' OR v_sub.status = 'expired' THEN
    -- Explicitly expired trial
    v_limit := 25;
    v_plan := 'free_trial';
    v_lifetime := false;
    v_trial_status := 'expired';
    v_trial_expires := v_sub.trial_expires_at;
    v_is_expired := true;
  ELSIF v_sub.trial_status = 'active' OR (v_sub.billing_type = 'free_trial' AND v_sub.status = 'trialing') THEN
    -- Active trial: evaluate authoritative database clock against expiry timestamp
    IF v_sub.trial_expires_at IS NOT NULL AND clock_timestamp() >= v_sub.trial_expires_at THEN
      -- Trial has expired!
      v_limit := 25;
      v_plan := 'free_trial';
      v_lifetime := false;
      v_trial_status := 'expired';
      v_trial_expires := v_sub.trial_expires_at;
      v_is_expired := true;

      -- Auto-update subscription status to expired
      UPDATE public.business_subscriptions
      SET
        trial_status = 'expired',
        status = 'expired',
        updated_at = clock_timestamp()
      WHERE business_id = p_business_id
        AND trial_status = 'active';
    ELSE
      -- Active valid 14-day trial
      v_limit := 25;
      v_plan := 'free_trial';
      v_lifetime := false;
      v_trial_status := 'active';
      v_trial_expires := v_sub.trial_expires_at;
      v_is_expired := false;
    END IF;
  ELSE
    -- Past due, cancelled, or incomplete paid subscription
    v_limit := v_sub.max_active_customers;
    v_plan := v_sub.plan_id;
    v_lifetime := v_sub.is_lifetime;
    v_trial_status := COALESCE(v_sub.trial_status, 'converted');
    v_trial_expires := v_sub.trial_expires_at;
    v_is_expired := false;
  END IF;

  -- 3. Count non-archived customers (authoritative active customer count)
  SELECT count(*)::INTEGER
  INTO v_current_count
  FROM public.customers c
  WHERE c.business_id = p_business_id
    AND c.archived_at IS NULL;

  -- 4. Calculate allowance and remaining capacity
  IF v_trial_status = 'not_started' THEN
    v_allowed := false;
    v_remaining := 0;
  ELSIF v_is_expired THEN
    v_allowed := false;
    v_remaining := 0;
  ELSE
    v_remaining := GREATEST(0, v_limit - v_current_count);
    v_allowed := (v_current_count + p_incoming_count <= v_limit);
  END IF;

  RETURN QUERY SELECT
    v_allowed AS allowed,
    v_current_count AS current_active_count,
    v_limit AS max_capacity,
    v_remaining AS remaining_capacity,
    v_plan AS plan_id,
    v_lifetime AS is_lifetime,
    v_trial_status AS trial_status,
    v_trial_expires AS trial_expires_at,
    v_is_expired AS is_trial_expired;
END;
$$;

REVOKE ALL ON FUNCTION public.check_customer_capacity(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_customer_capacity(UUID, INTEGER) TO authenticated, anon, service_role;

-- 4. COMPATIBILITY BACKFILL FOR EXISTING WORKSPACES
-- Preserves all existing businesses, customers, and active subscriptions:
-- - Active paid / lifetime subscriptions: marked trial_status = 'converted'
-- - Previously backfilled test trials: converted to explicit trial dates
DO $$
BEGIN
  -- Workspaces with active paid subscriptions or lifetime seats
  UPDATE public.business_subscriptions
  SET
    trial_status = 'converted',
    updated_at = now()
  WHERE (is_lifetime = true OR billing_type IN ('monthly_subscription', 'lifetime_purchase'))
    AND status = 'active'
    AND (trial_status IS NULL OR trial_status = 'not_started');

  -- Workspaces on prior trialbackfill: calculate explicit trial timeline based on created_at
  UPDATE public.business_subscriptions
  SET
    trial_duration_days = 14,
    trial_started_at = COALESCE(trial_started_at, created_at),
    trial_expires_at = COALESCE(trial_expires_at, created_at + INTERVAL '14 days'),
    trial_status = CASE
      WHEN now() >= (created_at + INTERVAL '14 days') THEN 'expired'
      ELSE 'active'
    END,
    status = CASE
      WHEN now() >= (created_at + INTERVAL '14 days') THEN 'expired'
      ELSE 'trialing'
    END,
    plan_id = 'free_trial',
    updated_at = now()
  WHERE billing_type = 'free_trial'
    AND (trial_status IS NULL OR trial_status = 'not_started' OR trial_expires_at IS NULL);
END $$;


-- 5. UPDATED UPGRADE FUNCTIONS: CONVERT TRIAL TO PAID SUBSCRIPTION

-- Claim Founding Lifetime Slot atomically (Sets trial_status = 'converted')
CREATE OR REPLACE FUNCTION public.claim_founding_lifetime_slot(
  p_business_id UUID,
  p_user_id UUID,
  p_order_id TEXT,
  p_payment_id TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_effective_user_id UUID;
  v_is_service_role BOOLEAN;
  v_current_slots INTEGER;
  v_assigned_slot INTEGER;
  v_existing_tx RECORD;
BEGIN
  -- Obtain advisory transaction lock to guarantee strictly serialized slot claims
  PERFORM pg_advisory_xact_lock(hashtext('founding_lifetime_seat_claim_lock'));

  -- 1. Input parameter validation
  IF p_business_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: business_id is required.' USING ERRCODE = '22023';
  END IF;

  IF p_payment_id IS NULL OR length(trim(p_payment_id)) < 5 THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: A valid razorpay_payment_id is required.' USING ERRCODE = '22023';
  END IF;

  -- 2. Authorization boundary & caller identity resolution
  v_caller_id := auth.uid();
  v_is_service_role := (current_setting('request.jwt.claim.role', true) = 'service_role');

  IF v_is_service_role THEN
    v_effective_user_id := COALESCE(p_user_id, v_caller_id);
  ELSIF v_caller_id IS NOT NULL THEN
    v_effective_user_id := v_caller_id;
    IF NOT public.is_business_owner_or_manager(p_business_id) THEN
      RAISE EXCEPTION 'UNAUTHORIZED: Caller is not an authorized owner or manager of this workspace.'
        USING ERRCODE = '42501';
    END IF;
  ELSE
    RAISE EXCEPTION 'UNAUTHENTICATED: Authentication required to claim lifetime slots.'
      USING ERRCODE = '42501';
  END IF;

  -- 3. Cross-tenant payment protection
  IF EXISTS (
    SELECT 1 FROM public.business_subscriptions
    WHERE razorpay_payment_id = p_payment_id
      AND business_id <> p_business_id
  ) THEN
    RAISE EXCEPTION 'PAYMENT_CROSS_TENANT_VIOLATION: Payment ID % is already assigned to another workspace.', p_payment_id
      USING ERRCODE = '42501';
  END IF;

  SELECT pt.business_id, pt.plan_id, pt.amount_paise, pt.currency
  INTO v_existing_tx
  FROM public.payment_transactions pt
  WHERE pt.razorpay_payment_id = p_payment_id;

  IF FOUND THEN
    IF v_existing_tx.business_id <> p_business_id THEN
      RAISE EXCEPTION 'PAYMENT_CROSS_TENANT_VIOLATION: Payment ID % belongs to another workspace.', p_payment_id
        USING ERRCODE = '42501';
    END IF;

    IF v_existing_tx.amount_paise <> 59900 THEN
      RAISE EXCEPTION 'PAYMENT_AMOUNT_MISMATCH: Lifetime plan requires 59900 paise, recorded amount was %.', v_existing_tx.amount_paise
        USING ERRCODE = '22000';
    END IF;

    IF v_existing_tx.currency <> 'INR' THEN
      RAISE EXCEPTION 'PAYMENT_CURRENCY_MISMATCH: Invalid currency %.', v_existing_tx.currency
        USING ERRCODE = '22000';
    END IF;
  END IF;

  -- 4. Check if this business already has an active lifetime slot
  SELECT lifetime_slot_number INTO v_assigned_slot
  FROM public.business_subscriptions
  WHERE business_id = p_business_id
    AND is_lifetime = true
    AND status = 'active';

  IF FOUND AND v_assigned_slot IS NOT NULL THEN
    RETURN v_assigned_slot;
  END IF;

  -- 5. Count existing claimed active lifetime slots
  SELECT count(*)::INTEGER INTO v_current_slots
  FROM public.business_subscriptions
  WHERE is_lifetime = true
    AND status = 'active';

  IF v_current_slots >= 25 THEN
    RAISE EXCEPTION 'FOUNDING_LIFETIME_SOLD_OUT: All 25 lifetime launch slots have been claimed.'
      USING ERRCODE = 'P0001';
  END IF;

  -- Find the lowest available slot number between 1 and 25
  SELECT s.num INTO v_assigned_slot
  FROM generate_series(1, 25) AS s(num)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.business_subscriptions bs
    WHERE bs.lifetime_slot_number = s.num
      AND bs.is_lifetime = true
      AND bs.status = 'active'
  )
  ORDER BY s.num ASC
  LIMIT 1;

  IF v_assigned_slot IS NULL THEN
    RAISE EXCEPTION 'FOUNDING_LIFETIME_SOLD_OUT: All 25 lifetime launch slots have been claimed.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 6. Upsert subscription record (marks trial_status = 'converted')
  INSERT INTO public.business_subscriptions (
    business_id,
    plan_id,
    billing_type,
    status,
    max_active_customers,
    razorpay_order_id,
    razorpay_payment_id,
    is_lifetime,
    lifetime_slot_number,
    trial_status,
    updated_at
  ) VALUES (
    p_business_id,
    'founding_lifetime',
    'lifetime_purchase',
    'active',
    100,
    p_order_id,
    p_payment_id,
    true,
    v_assigned_slot,
    'converted',
    now()
  )
  ON CONFLICT (business_id) DO UPDATE SET
    plan_id = 'founding_lifetime',
    billing_type = 'lifetime_purchase',
    status = 'active',
    max_active_customers = 100,
    razorpay_order_id = p_order_id,
    razorpay_payment_id = p_payment_id,
    is_lifetime = true,
    lifetime_slot_number = v_assigned_slot,
    trial_status = 'converted',
    updated_at = now();

  -- 7. Record payment transaction (idempotent on razorpay_payment_id)
  INSERT INTO public.payment_transactions (
    business_id,
    user_id,
    plan_id,
    billing_type,
    amount_paise,
    currency,
    status,
    razorpay_order_id,
    razorpay_payment_id,
    metadata,
    updated_at
  ) VALUES (
    p_business_id,
    v_effective_user_id,
    'founding_lifetime',
    'lifetime_purchase',
    59900,
    'INR',
    'captured',
    p_order_id,
    p_payment_id,
    jsonb_build_object('slot_number', v_assigned_slot),
    now()
  )
  ON CONFLICT (razorpay_payment_id) DO UPDATE SET
    status = 'captured',
    metadata = jsonb_build_object('slot_number', v_assigned_slot),
    updated_at = now();

  -- 8. Record activity (isolated from transaction rollback)
  BEGIN
    INSERT INTO public.activities (
      business_id,
      actor_user_id,
      action_type,
      description,
      metadata
    ) VALUES (
      p_business_id,
      v_effective_user_id,
      'LIFETIME_PLAN_ACTIVATED',
      format('Activated Founding Lifetime Plan (Slot #%s of 25) with 100 active customer capacity.', v_assigned_slot),
      jsonb_build_object(
        'slot_number', v_assigned_slot,
        'order_id', p_order_id,
        'payment_id', p_payment_id
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ACTIVITIES_LOG_FAILED: %', SQLERRM;
  END;

  RETURN v_assigned_slot;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_founding_lifetime_slot(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_founding_lifetime_slot(UUID, UUID, TEXT, TEXT) TO authenticated, service_role;

-- Activate recurring monthly subscription atomically (Sets trial_status = 'converted')
CREATE OR REPLACE FUNCTION public.activate_recurring_subscription(
  p_business_id UUID,
  p_user_id UUID,
  p_plan_id TEXT,
  p_max_active_customers INTEGER,
  p_amount_paise INTEGER,
  p_subscription_id TEXT,
  p_payment_id TEXT,
  p_signature TEXT,
  p_current_period_start TIMESTAMPTZ,
  p_current_period_end TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_effective_user_id UUID;
  v_is_service_role BOOLEAN;
  v_existing_tx RECORD;
BEGIN
  -- 1. Input parameter validation
  IF p_business_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: business_id is required.' USING ERRCODE = '22023';
  END IF;

  IF p_plan_id NOT IN ('starter', 'business', 'business_growth', 'business_scale', 'large_business') THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: plan_id % is invalid.', p_plan_id USING ERRCODE = '22023';
  END IF;

  IF p_max_active_customers IS NULL OR p_max_active_customers <= 0 THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: max_active_customers must be greater than zero.' USING ERRCODE = '22023';
  END IF;

  IF p_amount_paise IS NULL OR p_amount_paise <= 0 THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: amount_paise must be greater than zero.' USING ERRCODE = '22023';
  END IF;

  IF p_payment_id IS NULL OR length(trim(p_payment_id)) < 5 THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: A valid razorpay_payment_id is required.' USING ERRCODE = '22023';
  END IF;

  -- 2. Authorization boundary & caller identity resolution
  v_caller_id := auth.uid();
  v_is_service_role := (current_setting('request.jwt.claim.role', true) = 'service_role');

  IF v_is_service_role THEN
    v_effective_user_id := COALESCE(p_user_id, v_caller_id);
  ELSIF v_caller_id IS NOT NULL THEN
    v_effective_user_id := v_caller_id;
    IF NOT public.is_business_owner_or_manager(p_business_id) THEN
      RAISE EXCEPTION 'UNAUTHORIZED: Caller is not an authorized owner or manager of this workspace.'
        USING ERRCODE = '42501';
    END IF;
  ELSE
    RAISE EXCEPTION 'UNAUTHENTICATED: Authentication required to activate subscriptions.'
      USING ERRCODE = '42501';
  END IF;

  -- 3. Cross-tenant payment protection & fraud validation
  IF EXISTS (
    SELECT 1 FROM public.business_subscriptions
    WHERE razorpay_payment_id = p_payment_id
      AND business_id <> p_business_id
  ) THEN
    RAISE EXCEPTION 'PAYMENT_CROSS_TENANT_VIOLATION: Payment ID % is already assigned to a different workspace.', p_payment_id
      USING ERRCODE = '42501';
  END IF;

  SELECT pt.business_id, pt.plan_id, pt.amount_paise, pt.currency
  INTO v_existing_tx
  FROM public.payment_transactions pt
  WHERE pt.razorpay_payment_id = p_payment_id;

  IF FOUND THEN
    IF v_existing_tx.business_id <> p_business_id THEN
      RAISE EXCEPTION 'PAYMENT_CROSS_TENANT_VIOLATION: Payment ID % was processed for another workspace.', p_payment_id
        USING ERRCODE = '42501';
    END IF;

    IF v_existing_tx.amount_paise <> p_amount_paise THEN
      RAISE EXCEPTION 'PAYMENT_AMOUNT_MISMATCH: Recorded payment amount % does not match requested plan price %.',
        v_existing_tx.amount_paise, p_amount_paise
        USING ERRCODE = '22000';
    END IF;

    IF v_existing_tx.currency <> 'INR' THEN
      RAISE EXCEPTION 'PAYMENT_CURRENCY_MISMATCH: Invalid payment currency %.', v_existing_tx.currency
        USING ERRCODE = '22000';
    END IF;

    IF v_existing_tx.plan_id <> p_plan_id THEN
      RAISE EXCEPTION 'PAYMENT_PLAN_MISMATCH: Payment was recorded for plan %, not %.',
        v_existing_tx.plan_id, p_plan_id
        USING ERRCODE = '22000';
    END IF;
  END IF;

  -- 4. Atomically upsert business subscription entitlement (marks trial_status = 'converted')
  INSERT INTO public.business_subscriptions (
    business_id,
    plan_id,
    billing_type,
    status,
    max_active_customers,
    razorpay_subscription_id,
    razorpay_payment_id,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    is_lifetime,
    trial_status,
    updated_at
  ) VALUES (
    p_business_id,
    p_plan_id,
    'monthly_subscription',
    'active',
    p_max_active_customers,
    p_subscription_id,
    p_payment_id,
    COALESCE(p_current_period_start, now()),
    COALESCE(p_current_period_end, now() + interval '30 days'),
    false,
    false,
    'converted',
    now()
  )
  ON CONFLICT (business_id) DO UPDATE SET
    plan_id = p_plan_id,
    billing_type = 'monthly_subscription',
    status = 'active',
    max_active_customers = p_max_active_customers,
    razorpay_subscription_id = p_subscription_id,
    razorpay_payment_id = p_payment_id,
    current_period_start = COALESCE(p_current_period_start, public.business_subscriptions.current_period_start, now()),
    current_period_end = COALESCE(p_current_period_end, public.business_subscriptions.current_period_end, now() + interval '30 days'),
    cancel_at_period_end = false,
    is_lifetime = false,
    trial_status = 'converted',
    updated_at = now();

  -- 5. Atomically upsert payment transaction
  INSERT INTO public.payment_transactions (
    business_id,
    user_id,
    plan_id,
    billing_type,
    amount_paise,
    currency,
    status,
    razorpay_subscription_id,
    razorpay_payment_id,
    razorpay_signature,
    updated_at
  ) VALUES (
    p_business_id,
    v_effective_user_id,
    p_plan_id,
    'monthly_subscription',
    p_amount_paise,
    'INR',
    'captured',
    p_subscription_id,
    p_payment_id,
    p_signature,
    now()
  )
  ON CONFLICT (razorpay_payment_id) DO UPDATE SET
    status = 'captured',
    updated_at = now();

  -- 6. Audit log in activities (isolated from rollback)
  BEGIN
    INSERT INTO public.activities (
      business_id,
      actor_user_id,
      action_type,
      description,
      metadata
    ) VALUES (
      p_business_id,
      v_effective_user_id,
      'SUBSCRIPTION_ACTIVATED',
      format('Activated %s monthly subscription with %s active customer limit.', p_plan_id, p_max_active_customers),
      jsonb_build_object(
        'plan_id', p_plan_id,
        'max_active_customers', p_max_active_customers,
        'amount_paise', p_amount_paise,
        'subscription_id', p_subscription_id,
        'payment_id', p_payment_id
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ACTIVITIES_LOG_FAILED: %', SQLERRM;
  END;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.activate_recurring_subscription(UUID, UUID, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_recurring_subscription(UUID, UUID, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;
