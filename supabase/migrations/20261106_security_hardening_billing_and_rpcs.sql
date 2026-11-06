-- ============================================================================
-- MIGRATION: 20261106_security_hardening_billing_and_rpcs.sql
-- DESCRIPTION: Hardens billing security:
--   1. Revokes write access on business_subscriptions and payment_transactions
--      from authenticated and anon roles (SELECT only for workspace members).
--   2. Revokes EXECUTE on claim_founding_lifetime_slot and activate_recurring_subscription
--      from PUBLIC, anon, and authenticated roles; grants EXECUTE ONLY to service_role.
--   3. Makes both billing activation functions FAIL CLOSED: raises an exception if
--      the verified payment transaction does not exist in payment_transactions,
--      is not captured, or does not match business_id, plan_id, currency, or amount.
--
-- ROLLBACK INSTRUCTIONS:
-- To rollback this migration, run the following:
--   1. Re-grant EXECUTE on claim_founding_lifetime_slot and activate_recurring_subscription
--      to authenticated:
--      GRANT EXECUTE ON FUNCTION public.claim_founding_lifetime_slot(UUID, UUID, TEXT, TEXT) TO authenticated;
--      GRANT EXECUTE ON FUNCTION public.activate_recurring_subscription(UUID, UUID, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
--   2. Re-create owner/manager manage policies:
--      CREATE POLICY "business_subscriptions_manage_owner_manager" ON public.business_subscriptions
--        FOR ALL USING (public.is_business_owner_or_manager(business_id))
--        WITH CHECK (public.is_business_owner_or_manager(business_id));
--      CREATE POLICY "payment_transactions_insert_owner_manager" ON public.payment_transactions
--        FOR INSERT WITH CHECK (public.is_business_owner_or_manager(business_id));
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. REVOKE CLIENT WRITE PRIVILEGES ON BILLING TABLES
-- ----------------------------------------------------------------------------

-- Drop client write policies
DROP POLICY IF EXISTS "business_subscriptions_manage_owner_manager" ON public.business_subscriptions;
DROP POLICY IF EXISTS "payment_transactions_insert_owner_manager" ON public.payment_transactions;

-- Revoke table-level write permissions from client roles
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.business_subscriptions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.payment_transactions FROM anon, authenticated;

-- Ensure SELECT permission remains available for authenticated members
GRANT SELECT ON TABLE public.business_subscriptions TO authenticated;
GRANT SELECT ON TABLE public.payment_transactions TO authenticated;

-- Confirm SELECT policies exist and are enforced
DROP POLICY IF EXISTS "business_subscriptions_select_member" ON public.business_subscriptions;
CREATE POLICY "business_subscriptions_select_member" ON public.business_subscriptions
  FOR SELECT
  USING (public.is_business_member(business_id));

DROP POLICY IF EXISTS "payment_transactions_select_owner_manager" ON public.payment_transactions;
CREATE POLICY "payment_transactions_select_owner_manager" ON public.payment_transactions
  FOR SELECT
  USING (public.is_business_owner_or_manager(business_id));

-- ----------------------------------------------------------------------------
-- 2. HARDEN claim_founding_lifetime_slot (FAIL CLOSED & SERVICE ROLE ONLY)
-- ----------------------------------------------------------------------------

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
  v_jwt_role TEXT;
  v_effective_user_id UUID;
  v_current_slots INTEGER;
  v_assigned_slot INTEGER;
  v_existing_tx RECORD;
BEGIN
  -- 1. Strictly enforce service_role authorization
  v_jwt_role := current_setting('request.jwt.claim.role', true);
  IF v_jwt_role IS DISTINCT FROM 'service_role' AND current_user NOT IN ('service_role', 'postgres') THEN
    RAISE EXCEPTION 'UNAUTHORIZED: claim_founding_lifetime_slot can only be executed by service_role via backend routes.'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Validate input parameters
  IF p_business_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: business_id is required.' USING ERRCODE = '22023';
  END IF;

  IF p_payment_id IS NULL OR length(trim(p_payment_id)) < 5 THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: A valid razorpay_payment_id is required.' USING ERRCODE = '22023';
  END IF;

  v_effective_user_id := p_user_id;

  -- 3. Obtain advisory transaction lock to guarantee strictly serialized slot claims
  PERFORM pg_advisory_xact_lock(hashtext('founding_lifetime_seat_claim_lock'));

  -- 4. Cross-tenant payment protection
  IF EXISTS (
    SELECT 1 FROM public.business_subscriptions
    WHERE razorpay_payment_id = p_payment_id
      AND business_id <> p_business_id
  ) THEN
    RAISE EXCEPTION 'PAYMENT_CROSS_TENANT_VIOLATION: Payment ID % is already assigned to another workspace.', p_payment_id
      USING ERRCODE = '42501';
  END IF;

  -- 5. FAIL-CLOSED PAYMENT TRANSACTION VERIFICATION
  -- The verified payment record MUST exist in payment_transactions with status 'captured'
  SELECT pt.business_id, pt.plan_id, pt.amount_paise, pt.currency, pt.status
  INTO v_existing_tx
  FROM public.payment_transactions pt
  WHERE pt.razorpay_payment_id = p_payment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_TRANSACTION_NOT_FOUND: No verified payment transaction found for payment ID %. The transaction must be recorded before claiming a slot.', p_payment_id
      USING ERRCODE = '20000';
  END IF;

  IF v_existing_tx.status <> 'captured' THEN
    RAISE EXCEPTION 'PAYMENT_STATUS_NOT_CAPTURED: Payment ID % has status % (must be captured).', p_payment_id, v_existing_tx.status
      USING ERRCODE = '20000';
  END IF;

  IF v_existing_tx.business_id <> p_business_id THEN
    RAISE EXCEPTION 'PAYMENT_CROSS_TENANT_VIOLATION: Payment ID % was recorded for business %, not %.', p_payment_id, v_existing_tx.business_id, p_business_id
      USING ERRCODE = '42501';
  END IF;

  IF v_existing_tx.amount_paise <> 59900 THEN
    RAISE EXCEPTION 'PAYMENT_AMOUNT_MISMATCH: Lifetime plan requires 59900 paise, recorded amount was %.', v_existing_tx.amount_paise
      USING ERRCODE = '22000';
  END IF;

  IF v_existing_tx.currency <> 'INR' THEN
    RAISE EXCEPTION 'PAYMENT_CURRENCY_MISMATCH: Invalid currency % (must be INR).', v_existing_tx.currency
      USING ERRCODE = '22000';
  END IF;

  -- 6. Check if this business already has an active lifetime slot (idempotency)
  SELECT lifetime_slot_number INTO v_assigned_slot
  FROM public.business_subscriptions
  WHERE business_id = p_business_id
    AND is_lifetime = true
    AND status = 'active';

  IF FOUND AND v_assigned_slot IS NOT NULL THEN
    RETURN v_assigned_slot;
  END IF;

  -- 7. Count currently claimed lifetime slots (cap = 25)
  SELECT COUNT(*) INTO v_current_slots
  FROM public.business_subscriptions
  WHERE is_lifetime = true
    AND status = 'active'
    AND lifetime_slot_number IS NOT NULL;

  IF v_current_slots >= 25 THEN
    RAISE EXCEPTION 'FOUNDING_LIFETIME_SOLD_OUT: All 25 founding lifetime seats have been claimed.'
      USING ERRCODE = '22000';
  END IF;

  -- 8. Assign next sequential slot number
  v_assigned_slot := v_current_slots + 1;

  -- 9. Upsert lifetime subscription entitlement
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
    trial_duration_days,
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
    14,
    clock_timestamp()
  )
  ON CONFLICT (business_id) DO UPDATE SET
    plan_id = 'founding_lifetime',
    billing_type = 'lifetime_purchase',
    status = 'active',
    max_active_customers = 100,
    razorpay_order_id = EXCLUDED.razorpay_order_id,
    razorpay_payment_id = EXCLUDED.razorpay_payment_id,
    is_lifetime = true,
    lifetime_slot_number = v_assigned_slot,
    trial_status = 'converted',
    trial_duration_days = 14,
    updated_at = clock_timestamp();

  RETURN v_assigned_slot;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. HARDEN activate_recurring_subscription (FAIL CLOSED & SERVICE ROLE ONLY)
-- ----------------------------------------------------------------------------

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
  v_jwt_role TEXT;
  v_existing_tx RECORD;
BEGIN
  -- 1. Strictly enforce service_role authorization
  v_jwt_role := current_setting('request.jwt.claim.role', true);
  IF v_jwt_role IS DISTINCT FROM 'service_role' AND current_user NOT IN ('service_role', 'postgres') THEN
    RAISE EXCEPTION 'UNAUTHORIZED: activate_recurring_subscription can only be executed by service_role via backend routes.'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Validate input parameters
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

  -- 3. Cross-tenant payment protection
  IF EXISTS (
    SELECT 1 FROM public.business_subscriptions
    WHERE razorpay_payment_id = p_payment_id
      AND business_id <> p_business_id
  ) THEN
    RAISE EXCEPTION 'PAYMENT_CROSS_TENANT_VIOLATION: Payment ID % is already assigned to a different workspace.', p_payment_id
      USING ERRCODE = '42501';
  END IF;

  -- 4. FAIL-CLOSED PAYMENT TRANSACTION VERIFICATION
  -- Verified payment transaction record MUST exist and be in 'captured' state
  SELECT pt.business_id, pt.plan_id, pt.amount_paise, pt.currency, pt.status
  INTO v_existing_tx
  FROM public.payment_transactions pt
  WHERE pt.razorpay_payment_id = p_payment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_TRANSACTION_NOT_FOUND: No verified payment transaction found for payment ID %. The transaction must be recorded before activating a subscription.', p_payment_id
      USING ERRCODE = '20000';
  END IF;

  IF v_existing_tx.status <> 'captured' THEN
    RAISE EXCEPTION 'PAYMENT_STATUS_NOT_CAPTURED: Payment ID % has status % (must be captured).', p_payment_id, v_existing_tx.status
      USING ERRCODE = '20000';
  END IF;

  IF v_existing_tx.business_id <> p_business_id THEN
    RAISE EXCEPTION 'PAYMENT_CROSS_TENANT_VIOLATION: Payment ID % was processed for business %, not %.',
      p_payment_id, v_existing_tx.business_id, p_business_id
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

  -- 5. Upsert subscription entitlement record
  INSERT INTO public.business_subscriptions (
    business_id,
    plan_id,
    billing_type,
    status,
    max_active_customers,
    razorpay_subscription_id,
    razorpay_payment_id,
    is_lifetime,
    current_period_start,
    current_period_end,
    trial_status,
    trial_duration_days,
    updated_at
  ) VALUES (
    p_business_id,
    p_plan_id,
    'monthly_subscription',
    'active',
    p_max_active_customers,
    p_subscription_id,
    p_payment_id,
    false,
    p_current_period_start,
    p_current_period_end,
    'converted',
    14,
    clock_timestamp()
  )
  ON CONFLICT (business_id) DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    billing_type = 'monthly_subscription',
    status = 'active',
    max_active_customers = EXCLUDED.max_active_customers,
    razorpay_subscription_id = COALESCE(EXCLUDED.razorpay_subscription_id, business_subscriptions.razorpay_subscription_id),
    razorpay_payment_id = EXCLUDED.razorpay_payment_id,
    is_lifetime = false,
    lifetime_slot_number = NULL,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    trial_status = 'converted',
    trial_duration_days = 14,
    updated_at = clock_timestamp();

  RETURN true;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. REVOKE EXECUTE PRIVILEGES FROM PUBLIC & AUTHENTICATED
-- ----------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.claim_founding_lifetime_slot(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_founding_lifetime_slot(UUID, UUID, TEXT, TEXT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.activate_recurring_subscription(UUID, UUID, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_recurring_subscription(UUID, UUID, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
