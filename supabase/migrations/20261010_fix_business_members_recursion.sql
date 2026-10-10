-- ==============================================================================
-- RENEWALDESK - FORWARD REPAIR MIGRATION
-- Fix Business Membership RLS Recursion & Enforce Strict Privilege Security
-- ==============================================================================
-- Target Database: RenewalDesk Supabase Project (spuqvffprkzibvwfajgi)
-- Safety: Forward-only, repeatable, non-destructive.
--         Does NOT drop tables, reset schemas, or alter customer/service data.
--
-- Security Objectives:
-- 1. Eliminates PostgreSQL 42P17 infinite recursion on public.business_members.
-- 2. Removes all client-side INSERT, UPDATE, and DELETE policies on public.business_members.
--    Clients CANNOT self-assign memberships, escalate roles, or join other businesses.
-- 3. Retains strictly non-recursive SELECT policy: USING (user_id = auth.uid()).
-- 4. Reaffirms create_business_and_owner as the sole authorized, atomic onboarding
--    mechanism (SECURITY DEFINER, SET search_path = public, auth.uid() required).
--    Matches exact signature expected by app/onboarding/page.tsx.
-- 5. Defines add_business_member with rigorous role hierarchy and authorization:
--    - Queries caller's actual role from database; never trusts client claims.
--    - Only owners can invite owners or managers.
--    - Managers can only invite staff.
--    - Managers cannot promote themselves or anyone else.
--    - Prevents silent role alteration (rejects duplicate invitations explicitly).
-- 6. Ensures helper security functions (is_business_member, is_business_owner_or_manager)
--    execute with STABLE, explicit search_path, and proper permissions.
-- ==============================================================================

-- 1. DROP ALL PREVIOUS POLICIES ON business_members
DROP POLICY IF EXISTS "Members can view co-members of their businesses" ON public.business_members;
DROP POLICY IF EXISTS "Owners can manage business memberships" ON public.business_members;
DROP POLICY IF EXISTS "Users can view own business memberships" ON public.business_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.business_members;
DROP POLICY IF EXISTS "Users can insert own business memberships" ON public.business_members;
DROP POLICY IF EXISTS "Users can update own business memberships" ON public.business_members;
DROP POLICY IF EXISTS "Business members can view memberships" ON public.business_members;

-- 2. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;

-- 3. CREATE STRICT, NON-RECURSIVE, READ-ONLY CLIENT POLICY ON business_members
-- Authenticated users can ONLY read their own membership rows.
-- Direct client INSERT, UPDATE, and DELETE are DENIED by default (no policies granted).
CREATE POLICY "Users can view own business memberships"
  ON public.business_members FOR SELECT
  USING (user_id = auth.uid());

-- 4. ENSURE HELPER SECURITY DEFINER FUNCTIONS OPERATE SAFELY
CREATE OR REPLACE FUNCTION public.is_business_member(check_business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members
    WHERE business_id = check_business_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_business_owner_or_manager(check_business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members
    WHERE business_id = check_business_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'manager')
  );
$$;

-- 5. REAFFIRM ATOMIC ONBOARDING SECURITY DEFINER FUNCTION
CREATE OR REPLACE FUNCTION public.create_business_and_owner(
  p_name TEXT,
  p_business_type TEXT DEFAULT 'Air Conditioning Maintenance',
  p_phone TEXT DEFAULT '',
  p_city TEXT DEFAULT 'Kochi',
  p_timezone TEXT DEFAULT 'Asia/Kolkata',
  p_currency TEXT DEFAULT '₹'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_business_id UUID;
  v_created_biz public.businesses%ROWTYPE;
BEGIN
  -- Require authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Business name is required';
  END IF;

  -- 1. Create Business
  INSERT INTO public.businesses (
    name,
    business_type,
    phone,
    address,
    timezone,
    currency
  ) VALUES (
    trim(p_name),
    COALESCE(p_business_type, 'Air Conditioning Maintenance'),
    COALESCE(p_phone, ''),
    COALESCE(p_city, 'Kochi'),
    COALESCE(p_timezone, 'Asia/Kolkata'),
    COALESCE(p_currency, '₹')
  )
  RETURNING * INTO v_created_biz;

  v_business_id := v_created_biz.id;

  -- 2. Create Owner Membership (Atomic - sets caller as owner)
  INSERT INTO public.business_members (business_id, user_id, role)
  VALUES (v_business_id, v_user_id, 'owner')
  ON CONFLICT (business_id, user_id) DO UPDATE SET role = 'owner';

  -- 3. Seed Default Catalog Items for this new business
  INSERT INTO public.service_types (business_id, name, description, interval_value, interval_unit, typical_fee, is_active)
  VALUES
    (v_business_id, 'AC Periodic General Service', 'Standard filter wash, coil inspection & drainage flush', 6, 'MONTHS', 1200, true),
    (v_business_id, 'Deep Jet Chemical Foam Wash', 'High-pressure foam jet wash for heavy cooling restoration', 12, 'MONTHS', 1800, true),
    (v_business_id, 'Refrigerant Gas Leak & Top-up', 'Pressure test, leak sealing & Freon gas top-up', 12, 'MONTHS', 2200, true),
    (v_business_id, 'Annual Maintenance Contract (AMC)', 'Comprehensive quarterly routine visits & emergency breakdowns', 3, 'MONTHS', 3500, true)
  ON CONFLICT DO NOTHING;

  -- 4. Seed Default WhatsApp Message Templates
  INSERT INTO public.message_templates (business_id, name, template_type, message_body)
  VALUES
    (v_business_id, 'Service Due Soon', 'DUE_SOON', 'Hi {{customer_name}}, this is {{business_name}}. Your {{service_name}} for your {{asset_name}} is due on {{due_date}}. Would you like us to schedule a technician visit this week?'),
    (v_business_id, 'Service Due Today', 'DUE_TODAY', 'Good morning {{customer_name}}! Your {{service_name}} with {{business_name}} is due today. Shall we send our technician today or tomorrow?'),
    (v_business_id, 'Service Overdue', 'OVERDUE', 'Hello {{customer_name}}, your {{service_name}} is overdue by {{days_overdue}} days. Delaying service may lead to higher power bills or cooling failure. Reply to book your slot!'),
    (v_business_id, 'Booking Confirmation', 'BOOKING_CONFIRMATION', 'Hi {{customer_name}}, your service appointment with {{business_name}} is confirmed for {{booking_date}}. Our technician will call you before arriving.'),
    (v_business_id, 'Service Completed', 'SERVICE_COMPLETED', 'Thank you {{customer_name}} for choosing {{business_name}}! Your {{service_name}} has been completed. Your next periodic maintenance is scheduled for {{next_due_date}}.')
  ON CONFLICT DO NOTHING;

  -- 5. Record activity
  INSERT INTO public.activities (business_id, actor_user_id, action_type, description)
  VALUES (v_business_id, v_user_id, 'BUSINESS_CREATED', 'Created business account and initialized service catalog');

  RETURN to_jsonb(v_created_biz);
END;
$$;

-- 6. AUTHORIZED TEAM MEMBER INVITATION PROCEDURE (Strict Privilege Hierarchy)
CREATE OR REPLACE FUNCTION public.add_business_member(
  p_business_id UUID,
  p_user_email TEXT,
  p_role TEXT DEFAULT 'staff'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_role TEXT;
  v_target_user_id UUID;
  v_new_member public.business_members%ROWTYPE;
BEGIN
  -- 1. Require authenticated caller
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Validate requested role parameter
  IF p_role IS NULL OR p_role NOT IN ('owner', 'manager', 'staff') THEN
    RAISE EXCEPTION 'Invalid role: must be owner, manager, or staff';
  END IF;

  -- 3. Query caller's actual membership role in this business directly from database
  SELECT role INTO v_caller_role
  FROM public.business_members
  WHERE business_id = p_business_id
    AND user_id = v_caller_id;

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Not authorized: you are not a member of this business';
  END IF;

  -- 4. Enforce strict role hierarchy and escalation prevention
  IF v_caller_role = 'staff' THEN
    RAISE EXCEPTION 'Not authorized: staff members cannot invite team members';
  ELSIF v_caller_role = 'manager' THEN
    -- Managers may only invite staff members
    IF p_role <> 'staff' THEN
      RAISE EXCEPTION 'Not authorized: managers can only invite staff members';
    END IF;
  ELSIF v_caller_role = 'owner' THEN
    -- Owners are authorized to invite any valid role
    NULL;
  ELSE
    RAISE EXCEPTION 'Not authorized: unknown membership role';
  END IF;

  -- 5. Look up target user by email in profiles
  SELECT id INTO v_target_user_id
  FROM public.profiles
  WHERE lower(email) = lower(trim(p_user_email));

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found in profiles', trim(p_user_email);
  END IF;

  -- 6. Check if target user is already a member (no silent role overwrites)
  IF EXISTS (
    SELECT 1 FROM public.business_members
    WHERE business_id = p_business_id
      AND user_id = v_target_user_id
  ) THEN
    RAISE EXCEPTION 'User is already a member of this business';
  END IF;

  -- 7. Insert the new membership atomically
  INSERT INTO public.business_members (business_id, user_id, role)
  VALUES (p_business_id, v_target_user_id, p_role)
  RETURNING * INTO v_new_member;

  RETURN to_jsonb(v_new_member);
END;
$$;

-- 7. EXECUTION PRIVILEGES (Revoke from anon, grant strictly to authenticated)
REVOKE ALL ON FUNCTION public.create_business_and_owner(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_business_and_owner(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.add_business_member(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_business_member(UUID, TEXT, TEXT) TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_business_member(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_business_owner_or_manager(UUID) TO authenticated, anon;

-- 8. RELOAD POSTGREST SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
