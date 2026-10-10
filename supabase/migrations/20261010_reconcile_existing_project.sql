-- ==============================================================================
-- RENEWALDESK — EXISTING PROJECT FORWARD RECONCILIATION MIGRATION
-- Migration File: 20261010_reconcile_existing_project.sql
-- Purpose: Safely reconciles missing RPC functions, execution grants, triggers,
--          and RLS policies on an existing, populated database without dropping tables.
-- Safe: Non-destructive, repeatable (idempotent), preserves all existing data.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENSURE TABLES EXIST (Non-destructive check)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT,
  business_type TEXT NOT NULL DEFAULT 'Air Conditioning Maintenance',
  phone TEXT,
  email TEXT,
  address TEXT,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  currency TEXT NOT NULL DEFAULT '₹',
  default_interval_months INTEGER NOT NULL DEFAULT 6,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'staff')) DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  locality TEXT,
  notes TEXT,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL DEFAULT 'Air Conditioner',
  brand TEXT,
  model TEXT,
  capacity TEXT,
  location TEXT,
  serial_number TEXT,
  installation_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  interval_value INTEGER NOT NULL CHECK (interval_value > 0),
  interval_unit TEXT NOT NULL CHECK (interval_unit IN ('DAYS', 'MONTHS', 'YEARS')) DEFAULT 'MONTHS',
  typical_fee NUMERIC NOT NULL CHECK (typical_fee >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  service_type_id UUID REFERENCES public.service_types(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  service_date DATE NOT NULL,
  fee_charged NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  service_type_id UUID REFERENCES public.service_types(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  last_service_date DATE,
  next_due_date DATE NOT NULL,
  interval_value INTEGER NOT NULL,
  interval_unit TEXT NOT NULL CHECK (interval_unit IN ('DAYS', 'MONTHS', 'YEARS')) DEFAULT 'MONTHS',
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED')) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES public.service_schedules(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'NOT_CONTACTED', 'CONTACTED', 'REPLIED', 'BOOKED', 'COMPLETED', 'NOT_INTERESTED', 'NO_RESPONSE'
  )) DEFAULT 'NOT_CONTACTED',
  contacted_at TIMESTAMPTZ,
  booked_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  next_follow_up_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN (
    'DUE_SOON', 'DUE_TODAY', 'OVERDUE', 'BOOKING_CONFIRMATION', 'SERVICE_COMPLETED'
  )),
  message_body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. ENSURE INDEXES EXIST
CREATE INDEX IF NOT EXISTS idx_business_members_user ON public.business_members(user_id);
CREATE INDEX IF NOT EXISTS idx_business_members_biz ON public.business_members(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_biz_phone ON public.customers(business_id, phone);
CREATE INDEX IF NOT EXISTS idx_customers_biz_name ON public.customers(business_id, name);
CREATE INDEX IF NOT EXISTS idx_assets_biz_cust ON public.assets(business_id, customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_types_biz_name ON public.service_types(business_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_service_records_biz_cust ON public.service_records(business_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_service_records_date ON public.service_records(business_id, service_date DESC);
CREATE INDEX IF NOT EXISTS idx_service_schedules_due ON public.service_schedules(business_id, next_due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_biz_status ON public.reminders(business_id, status);
CREATE INDEX IF NOT EXISTS idx_reminders_biz_due ON public.reminders(business_id, due_date);
CREATE INDEX IF NOT EXISTS idx_activities_biz ON public.activities(business_id, created_at DESC);

-- 4. SECURITY DEFINER HELPER FUNCTIONS
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

-- 5. NEW USER PROFILE SYNC FUNCTION & TRIGGER (Safe Execution)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    updated_at = now();
  RETURN new;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- In case trigger creation on auth.users requires elevated privileges in certain project environments
    RAISE NOTICE 'Could not set trigger on auth.users: %', SQLERRM;
END;
$$;

-- 6. ATOMIC ONBOARDING FUNCTION (Matches frontend rpc signature exactly)
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
  -- Authenticated user validation
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

  -- 2. Create Owner Membership
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

-- 7. EXECUTION GRANTS
REVOKE ALL ON FUNCTION public.create_business_and_owner(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_business_and_owner(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_member(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_business_owner_or_manager(UUID) TO authenticated, anon;

-- 8. ROW LEVEL SECURITY (RLS) ENABLEMENT
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- 9. SAFE RLS POLICIES (Idempotent - Drop and Recreate)
-- Profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Businesses
DROP POLICY IF EXISTS "Members can view their business" ON public.businesses;
CREATE POLICY "Members can view their business" ON public.businesses FOR SELECT USING (public.is_business_member(id));

DROP POLICY IF EXISTS "Owners and Managers can update their business" ON public.businesses;
CREATE POLICY "Owners and Managers can update their business" ON public.businesses FOR UPDATE USING (public.is_business_owner_or_manager(id)) WITH CHECK (public.is_business_owner_or_manager(id));

-- Business Members (Non-recursive direct policies)
DROP POLICY IF EXISTS "Members can view co-members of their businesses" ON public.business_members;
DROP POLICY IF EXISTS "Owners can manage business memberships" ON public.business_members;
DROP POLICY IF EXISTS "Users can view own business memberships" ON public.business_members;
DROP POLICY IF EXISTS "Users can insert own business memberships" ON public.business_members;

CREATE POLICY "Users can view own business memberships"
  ON public.business_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own business memberships"
  ON public.business_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Customers
DROP POLICY IF EXISTS "Business members can view customers" ON public.customers;
CREATE POLICY "Business members can view customers" ON public.customers FOR SELECT USING (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Business members can insert customers" ON public.customers;
CREATE POLICY "Business members can insert customers" ON public.customers FOR INSERT WITH CHECK (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Business members can update customers" ON public.customers;
CREATE POLICY "Business members can update customers" ON public.customers FOR UPDATE USING (public.is_business_member(business_id)) WITH CHECK (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Owners and Managers can delete customers" ON public.customers;
CREATE POLICY "Owners and Managers can delete customers" ON public.customers FOR DELETE USING (public.is_business_owner_or_manager(business_id));

-- Assets
DROP POLICY IF EXISTS "Business members can view assets" ON public.assets;
CREATE POLICY "Business members can view assets" ON public.assets FOR SELECT USING (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Business members can insert assets" ON public.assets;
CREATE POLICY "Business members can insert assets" ON public.assets FOR INSERT WITH CHECK (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Business members can update assets" ON public.assets;
CREATE POLICY "Business members can update assets" ON public.assets FOR UPDATE USING (public.is_business_member(business_id)) WITH CHECK (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Business members can delete assets" ON public.assets;
CREATE POLICY "Business members can delete assets" ON public.assets FOR DELETE USING (public.is_business_owner_or_manager(business_id));

-- Service Types
DROP POLICY IF EXISTS "Business members can view service types" ON public.service_types;
CREATE POLICY "Business members can view service types" ON public.service_types FOR SELECT USING (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Business members can insert service types" ON public.service_types;
CREATE POLICY "Business members can insert service types" ON public.service_types FOR INSERT WITH CHECK (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Business members can update service types" ON public.service_types;
CREATE POLICY "Business members can update service types" ON public.service_types FOR UPDATE USING (public.is_business_member(business_id)) WITH CHECK (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Owners and Managers can delete unreferenced service types" ON public.service_types;
CREATE POLICY "Owners and Managers can delete unreferenced service types" ON public.service_types FOR DELETE USING (
  public.is_business_owner_or_manager(business_id)
  AND NOT EXISTS (SELECT 1 FROM public.service_records sr WHERE sr.service_type_id = service_types.id)
  AND NOT EXISTS (SELECT 1 FROM public.service_schedules ss WHERE ss.service_type_id = service_types.id)
);

-- Service Records
DROP POLICY IF EXISTS "Business members can view service records" ON public.service_records;
CREATE POLICY "Business members can view service records" ON public.service_records FOR SELECT USING (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Business members can insert service records" ON public.service_records;
CREATE POLICY "Business members can insert service records" ON public.service_records FOR INSERT WITH CHECK (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Business members can update service records" ON public.service_records;
CREATE POLICY "Business members can update service records" ON public.service_records FOR UPDATE USING (public.is_business_member(business_id)) WITH CHECK (public.is_business_member(business_id));

-- Service Schedules
DROP POLICY IF EXISTS "Business members can view service schedules" ON public.service_schedules;
CREATE POLICY "Business members can view service schedules" ON public.service_schedules FOR SELECT USING (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Business members can insert service schedules" ON public.service_schedules;
CREATE POLICY "Business members can insert service schedules" ON public.service_schedules FOR INSERT WITH CHECK (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Business members can update service schedules" ON public.service_schedules;
CREATE POLICY "Business members can update service schedules" ON public.service_schedules FOR UPDATE USING (public.is_business_member(business_id)) WITH CHECK (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Owners can delete service schedules" ON public.service_schedules;
CREATE POLICY "Owners can delete service schedules" ON public.service_schedules FOR DELETE USING (public.is_business_owner_or_manager(business_id));

-- Reminders
DROP POLICY IF EXISTS "Business members can view reminders" ON public.reminders;
CREATE POLICY "Business members can view reminders" ON public.reminders FOR SELECT USING (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Business members can insert reminders" ON public.reminders;
CREATE POLICY "Business members can insert reminders" ON public.reminders FOR INSERT WITH CHECK (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Business members can update reminders" ON public.reminders;
CREATE POLICY "Business members can update reminders" ON public.reminders FOR UPDATE USING (public.is_business_member(business_id)) WITH CHECK (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Owners can delete reminders" ON public.reminders;
CREATE POLICY "Owners can delete reminders" ON public.reminders FOR DELETE USING (public.is_business_owner_or_manager(business_id));

-- Message Templates
DROP POLICY IF EXISTS "Business members can view message templates" ON public.message_templates;
CREATE POLICY "Business members can view message templates" ON public.message_templates FOR SELECT USING (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Owners and Managers can manage message templates" ON public.message_templates;
CREATE POLICY "Owners and Managers can manage message templates" ON public.message_templates FOR ALL USING (public.is_business_owner_or_manager(business_id)) WITH CHECK (public.is_business_owner_or_manager(business_id));

-- Activities
DROP POLICY IF EXISTS "Business members can view activities" ON public.activities;
CREATE POLICY "Business members can view activities" ON public.activities FOR SELECT USING (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Business members can insert activities" ON public.activities;
CREATE POLICY "Business members can insert activities" ON public.activities FOR INSERT WITH CHECK (public.is_business_member(business_id));

-- 10. REFRESH SCHEMA CACHE FOR POSTGREST
NOTIFY pgrst, 'reload schema';
