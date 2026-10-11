-- ==============================================================================
-- RenewalDesk Migration: Billing, Subscriptions, Entitlements & Customer Capacity
-- Migration: 20261012_billing_and_subscriptions.sql
-- ==============================================================================

-- 1. BUSINESS_SUBSCRIPTIONS TABLE (Entitlement and active plan per tenant workspace)
CREATE TABLE IF NOT EXISTS public.business_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL DEFAULT 'starter',
  billing_type TEXT NOT NULL CHECK (billing_type IN ('monthly_subscription', 'lifetime_purchase', 'free_trial')) DEFAULT 'free_trial',
  status TEXT NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'cancelled', 'expired', 'incomplete')) DEFAULT 'trialing',
  max_active_customers INTEGER NOT NULL DEFAULT 25,
  razorpay_customer_id TEXT,
  razorpay_subscription_id TEXT,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  is_lifetime BOOLEAN NOT NULL DEFAULT false,
  lifetime_slot_number INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_business_subscriptions_biz UNIQUE (business_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_lifetime_slot
  ON public.business_subscriptions(lifetime_slot_number)
  WHERE is_lifetime = true AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_subscriptions_biz ON public.business_subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_sub_id ON public.business_subscriptions(razorpay_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_order_id ON public.business_subscriptions(razorpay_order_id);

-- 2. PAYMENT_TRANSACTIONS TABLE (Audit log of all processed payments)
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  plan_id TEXT NOT NULL,
  billing_type TEXT NOT NULL,
  amount_paise INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL CHECK (status IN ('created', 'authorized', 'captured', 'failed', 'refunded')),
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT UNIQUE,
  razorpay_subscription_id TEXT,
  razorpay_signature TEXT,
  error_code TEXT,
  error_description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pay_tx_biz ON public.payment_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_pay_tx_payment_id ON public.payment_transactions(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_pay_tx_sub_id ON public.payment_transactions(razorpay_subscription_id);

-- 3. WEBHOOK_EVENTS TABLE (Idempotency ledger for incoming Razorpay webhooks)
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('processed', 'ignored', 'failed')) DEFAULT 'processed',
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_id ON public.webhook_events(event_id);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.business_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Subscriptions: Members of the business can read their current subscription/entitlement
DROP POLICY IF EXISTS "business_subscriptions_select_member" ON public.business_subscriptions;
CREATE POLICY "business_subscriptions_select_member" ON public.business_subscriptions
  FOR SELECT
  USING (public.is_business_member(business_id));

-- Subscriptions write: Zero client write permissions. Entitlements are only updated by verified server actions.

-- Payment transactions: Only Owners and Managers can view payment transactions
DROP POLICY IF EXISTS "payment_transactions_select_owner_manager" ON public.payment_transactions;
CREATE POLICY "payment_transactions_select_owner_manager" ON public.payment_transactions
  FOR SELECT
  USING (public.is_business_owner_or_manager(business_id));

-- Payment transactions write: Zero client write permissions.

-- Webhook events: Zero client access (private table for server-side webhook processor).

-- 5. FUNCTION: Check customer capacity
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
  is_lifetime BOOLEAN
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
BEGIN
  -- 1. Find active subscription or use default trial capacity (25)
  SELECT
    bs.plan_id,
    bs.max_active_customers,
    bs.is_lifetime,
    bs.status
  INTO v_sub
  FROM public.business_subscriptions bs
  WHERE bs.business_id = p_business_id;

  IF FOUND AND v_sub.status IN ('active', 'trialing') THEN
    v_limit := v_sub.max_active_customers;
    v_plan := v_sub.plan_id;
    v_lifetime := v_sub.is_lifetime;
  ELSE
    -- Default free trial / initial workspace capacity
    v_limit := 25;
    v_plan := 'starter';
    v_lifetime := false;
  END IF;

  -- 2. Count active non-archived customers
  SELECT count(*)::INTEGER
  INTO v_current_count
  FROM public.customers c
  WHERE c.business_id = p_business_id
    AND c.archived_at IS NULL;

  RETURN QUERY SELECT
    (v_current_count + p_incoming_count <= v_limit) AS allowed,
    v_current_count AS current_active_count,
    v_limit AS max_capacity,
    GREATEST(0, v_limit - v_current_count) AS remaining_capacity,
    v_plan AS plan_id,
    v_lifetime AS is_lifetime;
END;
$$;

-- 6. FUNCTION: Claim founding lifetime slot atomically (Capped at 25)
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
  v_current_slots INTEGER;
  v_assigned_slot INTEGER;
BEGIN
  -- Obtain advisory transaction lock to guarantee strictly serialized slot claims
  PERFORM pg_advisory_xact_lock(hashtext('founding_lifetime_seat_claim_lock'));

  -- 1. Check if this business already has an active lifetime slot
  SELECT lifetime_slot_number INTO v_assigned_slot
  FROM public.business_subscriptions
  WHERE business_id = p_business_id
    AND is_lifetime = true
    AND status = 'active';

  IF FOUND AND v_assigned_slot IS NOT NULL THEN
    -- Already claimed for this business; return existing slot number
    RETURN v_assigned_slot;
  END IF;

  -- 2. Count existing claimed active lifetime slots
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

  -- 3. Upsert subscription record
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
    updated_at = now();

  -- 4. Record activity
  INSERT INTO public.activities (
    business_id,
    actor_user_id,
    action_type,
    description,
    metadata
  ) VALUES (
    p_business_id,
    p_user_id,
    'LIFETIME_PLAN_ACTIVATED',
    format('Activated Founding Lifetime Plan (Slot #%s of 25) with 100 active customer capacity.', v_assigned_slot),
    jsonb_build_object(
      'slot_number', v_assigned_slot,
      'order_id', p_order_id,
      'payment_id', p_payment_id
    )
  );

  RETURN v_assigned_slot;
END;
$$;

-- 7. SAFE BACKFILL: Ensure all existing workspaces have a baseline starter subscription
INSERT INTO public.business_subscriptions (
  business_id,
  plan_id,
  billing_type,
  status,
  max_active_customers
)
SELECT
  b.id,
  'starter',
  'free_trial',
  'trialing',
  25
FROM public.businesses b
ON CONFLICT (business_id) DO NOTHING;
