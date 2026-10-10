-- ==============================================================================
-- RENEWALDESK — READ-ONLY DATABASE AUDIT & DIAGNOSTIC SCRIPT
-- Project: spuqvffprkzibvwfajgi (RenewalDesk)
-- Safe: READ-ONLY (No modifications, no PII displayed)
-- ==============================================================================

-- 1. TABLE EXISTENCE & RLS STATUS
SELECT
  t.table_name,
  CASE WHEN t.table_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END AS table_status,
  COALESCE(c.relrowsecurity, false) AS rls_enabled,
  COALESCE(c.relforcerowsecurity, false) AS rls_forced
FROM (
  VALUES
    ('profiles'),
    ('businesses'),
    ('business_members'),
    ('customers'),
    ('assets'),
    ('service_types'),
    ('service_records'),
    ('service_schedules'),
    ('reminders'),
    ('message_templates'),
    ('activities')
) AS expected(table_name)
LEFT JOIN information_schema.tables t
  ON t.table_schema = 'public' AND t.table_name = expected.table_name
LEFT JOIN pg_class c
  ON c.relname = expected.table_name AND c.relnamespace = 'public'::regnamespace
ORDER BY expected.table_name;

-- 2. READ-ONLY AGGREGATE RECORD COUNTS (NO PII)
SELECT
  'profiles' AS table_name, count(*) AS total_rows FROM public.profiles
UNION ALL SELECT 'businesses', count(*) FROM public.businesses
UNION ALL SELECT 'business_members', count(*) FROM public.business_members
UNION ALL SELECT 'customers', count(*) FROM public.customers
UNION ALL SELECT 'assets', count(*) FROM public.assets
UNION ALL SELECT 'service_types', count(*) FROM public.service_types
UNION ALL SELECT 'service_records', count(*) FROM public.service_records
UNION ALL SELECT 'service_schedules', count(*) FROM public.service_schedules
UNION ALL SELECT 'reminders', count(*) FROM public.reminders
UNION ALL SELECT 'message_templates', count(*) FROM public.message_templates
UNION ALL SELECT 'activities', count(*) FROM public.activities;

-- 3. FUNCTION EXISTENCE & EXACT SIGNATURES
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type,
  p.prosecdef AS is_security_definer,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'create_business_and_owner',
    'is_business_member',
    'is_business_owner_or_manager',
    'handle_new_user'
  )
ORDER BY p.proname;

-- 4. RLS POLICIES INSTALLED IN PUBLIC SCHEMA
SELECT
  tablename,
  policyname,
  roles,
  cmd,
  permissive
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 5. TRIGGER ON auth.users
SELECT
  tgname AS trigger_name,
  relname AS table_name,
  CASE WHEN tgenabled = 'O' THEN 'ENABLED' ELSE 'DISABLED' END AS status
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE (n.nspname = 'auth' AND c.relname = 'users')
  AND tgname = 'on_auth_user_created';
