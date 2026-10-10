-- ==============================================================================
-- RENEWALDESK - FIX INFINITE RECURSION IN business_members RLS POLICIES
-- ==============================================================================
-- Description:
-- Fixes PostgreSQL error 42P17 ("infinite recursion detected in policy for relation business_members").
-- Previously, the SELECT policy on business_members called public.is_business_member(business_id),
-- which queried business_members, causing an infinite recursion loop that failed queries with status 500.
--
-- This fix replaces the recursive policies on public.business_members with direct,
-- non-recursive policies (user_id = auth.uid()) so users can read their own memberships,
-- and ensures helper security functions operate safely.
-- ==============================================================================

-- 1. DROP EXISTING RECURSIVE POLICIES ON business_members
DROP POLICY IF EXISTS "Members can view co-members of their businesses" ON public.business_members;
DROP POLICY IF EXISTS "Owners can manage business memberships" ON public.business_members;
DROP POLICY IF EXISTS "Users can view own business memberships" ON public.business_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.business_members;
DROP POLICY IF EXISTS "Users can insert own business memberships" ON public.business_members;
DROP POLICY IF EXISTS "Business members can view memberships" ON public.business_members;

-- 2. CREATE CLEAN, NON-RECURSIVE RLS POLICIES ON business_members
-- A user can directly view their own membership rows without any subqueries or function calls
CREATE POLICY "Users can view own business memberships"
  ON public.business_members FOR SELECT
  USING (user_id = auth.uid());

-- Allow inserting own membership row
CREATE POLICY "Users can insert own business memberships"
  ON public.business_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Allow updating own membership row
CREATE POLICY "Users can update own business memberships"
  ON public.business_members FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. ENSURE HELPER SECURITY DEFINER FUNCTIONS OPERATE SAFELY
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

-- 4. GRANT EXECUTION PRIVILEGES
GRANT EXECUTE ON FUNCTION public.is_business_member(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_business_owner_or_manager(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_business_and_owner(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 5. RELOAD POSTGREST SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
