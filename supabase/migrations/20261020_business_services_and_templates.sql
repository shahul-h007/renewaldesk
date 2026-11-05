-- ==============================================================================
-- RENEWALDESK — BUSINESS-AWARE SERVICE CATALOG & TEMPLATES MIGRATION
-- Migration: 20261020_business_services_and_templates.sql
--
-- 1. Adds optional structured address columns to public.customers:
--    - city TEXT
--    - pincode TEXT
--    - landmark TEXT
--
-- 2. Updates public.create_business_and_owner to seed category-specific
--    service catalog items and starter WhatsApp templates based on p_business_type:
--    - Vehicle Service & Auto Care
--    - Pest Control Services
--    - RO Water Purifier Service
--    - Appliance Repair & Maintenance
--    - Home Cleaning & Deep Wash
--    - Solar Panel Maintenance
--    - General Electrical & Plumbing
--    - Air Conditioning Maintenance
--    - Other / Generic (No AC-specific copy)
--
-- 3. Backward Compatibility & Safety:
--    - Function signature (TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) is strictly preserved.
--    - SECURITY DEFINER and SET search_path = public are preserved.
--    - ON CONFLICT DO NOTHING prevents duplicating entries on retries.
--    - Existing workspaces, customer schedules, and service history are unaffected.
-- ==============================================================================

-- 1. ADD OPTIONAL CUSTOMER ADDRESS COLUMNS
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS landmark TEXT;

-- 2. UPDATE ONBOARDING PROCEDURE
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
  v_norm_type TEXT;
BEGIN
  -- 0. Require authenticated caller
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate business name
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
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
    COALESCE(NULLIF(trim(p_business_type), ''), 'Air Conditioning Maintenance'),
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

  -- 3. Seed Category-Specific Service Types and WhatsApp Message Templates
  v_norm_type := lower(trim(COALESCE(p_business_type, '')));

  IF v_norm_type LIKE '%vehicle%' OR v_norm_type LIKE '%auto%' OR v_norm_type LIKE '%car%' OR v_norm_type LIKE '%motor%' OR v_norm_type LIKE '%bike%' OR v_norm_type LIKE '%garage%' THEN
    -- Vehicle Service & Auto Care
    INSERT INTO public.service_types (business_id, name, description, interval_value, interval_unit, typical_fee, is_active)
    VALUES
      (v_business_id, 'Periodic Vehicle Maintenance', 'Comprehensive periodic service, fluids top-up & multi-point safety check', 6, 'MONTHS', 3000, true),
      (v_business_id, 'Engine Oil & Filter Replacement', 'Synthetic/mineral engine oil drain and genuine oil filter change', 6, 'MONTHS', 1800, true),
      (v_business_id, 'Brake System Inspection & Service', 'Brake pads, fluid test, disc resurfacing & caliper check', 6, 'MONTHS', 1200, true),
      (v_business_id, 'Tyre Rotation & Wheel Alignment', 'Computerized wheel alignment, wheel balancing & tyre rotation', 6, 'MONTHS', 800, true),
      (v_business_id, 'Comprehensive Vehicle Safety Audit', 'Multipoint safety inspection including battery, suspension & electricals', 12, 'MONTHS', 1500, true)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.message_templates (business_id, name, template_type, message_body)
    VALUES
      (v_business_id, 'Service Due Soon', 'DUE_SOON', 'Hi {{customer_name}}, greetings from {{business_name}}! Your {{service_name}} for {{asset_name}} is due on {{due_date}}. Would you like to reserve a service bay this week? Reply with your preferred date and time.'),
      (v_business_id, 'Service Due Today', 'DUE_TODAY', 'Good morning {{customer_name}}! Your {{service_name}} with {{business_name}} is due today. Shall we book your vehicle in today or tomorrow?'),
      (v_business_id, 'Service Overdue', 'OVERDUE', 'Hello {{customer_name}}, your {{service_name}} for {{asset_name}} is overdue by {{days_overdue}} days. Delaying routine servicing can cause engine wear or unexpected breakdowns. Reply to schedule your visit!'),
      (v_business_id, 'Booking Confirmation', 'BOOKING_CONFIRMATION', 'Hi {{customer_name}}, your vehicle service appointment with {{business_name}} is confirmed for {{booking_date}}. Please drive in at your scheduled time or call us if you need pickup.'),
      (v_business_id, 'Service Completed', 'SERVICE_COMPLETED', 'Thank you {{customer_name}} for choosing {{business_name}}! Your {{service_name}} is completed. Your next periodic maintenance is scheduled for {{next_due_date}}.')
    ON CONFLICT DO NOTHING;

  ELSIF v_norm_type LIKE '%pest%' OR v_norm_type LIKE '%termite%' OR v_norm_type LIKE '%rodent%' OR v_norm_type LIKE '%bug%' THEN
    -- Pest Control Services
    INSERT INTO public.service_types (business_id, name, description, interval_value, interval_unit, typical_fee, is_active)
    VALUES
      (v_business_id, 'General Pest Control Treatment', 'Quarterly spray and gel baiting for cockroaches, ants & insects', 3, 'MONTHS', 1200, true),
      (v_business_id, 'Termite Inspection & Protection', 'Annual structural drilling, barrier injection & wood inspection', 12, 'MONTHS', 4500, true),
      (v_business_id, 'Rodent Control & Exclusion', 'Traps, bait stations & rodent entry proofing audit', 3, 'MONTHS', 1500, true),
      (v_business_id, 'Preventive Disinfestation Spray', 'Broad-spectrum odorless mist spray for preventive hygiene', 6, 'MONTHS', 1800, true),
      (v_business_id, 'Quarterly Follow-up Inspection', 'Follow-up visit to inspect bait stations and reapply treatments', 3, 'MONTHS', 1000, true)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.message_templates (business_id, name, template_type, message_body)
    VALUES
      (v_business_id, 'Service Due Soon', 'DUE_SOON', 'Hi {{customer_name}}, this is {{business_name}}. Your {{service_name}} for {{asset_name}} is due on {{due_date}}. Would you like us to schedule our technician visit this week?'),
      (v_business_id, 'Service Due Today', 'DUE_TODAY', 'Good morning {{customer_name}}! Your scheduled {{service_name}} with {{business_name}} is due today. Would today or tomorrow be convenient for our technician to visit?'),
      (v_business_id, 'Service Overdue', 'OVERDUE', 'Hello {{customer_name}}, your {{service_name}} is overdue by {{days_overdue}} days. Timely preventive treatment prevents pest resurgence. Reply to confirm your visit!'),
      (v_business_id, 'Booking Confirmation', 'BOOKING_CONFIRMATION', 'Hi {{customer_name}}, your pest treatment visit with {{business_name}} is confirmed for {{booking_date}}. Our specialist will arrive with protective gear.'),
      (v_business_id, 'Service Completed', 'SERVICE_COMPLETED', 'Thank you {{customer_name}} for choosing {{business_name}}! Your {{service_name}} is complete. Your next protective cycle is scheduled for {{next_due_date}}.')
    ON CONFLICT DO NOTHING;

  ELSIF v_norm_type LIKE '%purifier%' OR v_norm_type LIKE '%water%' OR v_norm_type LIKE '% ro %' OR v_norm_type LIKE 'ro %' OR v_norm_type LIKE '%ro' OR v_norm_type = 'ro' THEN
    -- RO Water Purifier Service
    INSERT INTO public.service_types (business_id, name, description, interval_value, interval_unit, typical_fee, is_active)
    VALUES
      (v_business_id, 'Periodic Filter Replacement', 'Sediment, pre-carbon & post-carbon cartridge replacement', 6, 'MONTHS', 1200, true),
      (v_business_id, 'RO Membrane Inspection & Cleaning', 'Membrane flush, TDS verification & pure water flow test', 12, 'MONTHS', 2000, true),
      (v_business_id, 'TDS Check & Leakage Audit', 'Water purity measurement, valve pressure test & leak sealing', 3, 'MONTHS', 500, true),
      (v_business_id, 'Complete Purifier Sanitization', 'Full tank sterilization, tube flushing & pump health audit', 12, 'MONTHS', 2500, true)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.message_templates (business_id, name, template_type, message_body)
    VALUES
      (v_business_id, 'Service Due Soon', 'DUE_SOON', 'Hi {{customer_name}}, this is {{business_name}}. Your {{service_name}} for {{asset_name}} is due on {{due_date}}. Regular filter replacement ensures safe and pure drinking water. Reply to book your visit!'),
      (v_business_id, 'Service Due Today', 'DUE_TODAY', 'Good morning {{customer_name}}! Your {{service_name}} with {{business_name}} is due today. Shall we dispatch a service technician today?'),
      (v_business_id, 'Service Overdue', 'OVERDUE', 'Hello {{customer_name}}, your {{service_name}} is overdue by {{days_overdue}} days. Overdue filters can affect drinking water quality and water output. Reply to book a quick filter change!'),
      (v_business_id, 'Booking Confirmation', 'BOOKING_CONFIRMATION', 'Hi {{customer_name}}, your purifier service with {{business_name}} is confirmed for {{booking_date}}. Our technician will call you before arrival.'),
      (v_business_id, 'Service Completed', 'SERVICE_COMPLETED', 'Thank you {{customer_name}} for choosing {{business_name}}! Your {{service_name}} is completed. Your next maintenance is scheduled for {{next_due_date}}.')
    ON CONFLICT DO NOTHING;

  ELSIF v_norm_type LIKE '%appliance%' OR v_norm_type LIKE '%refrigerator%' OR v_norm_type LIKE '%washing machine%' THEN
    -- Appliance Repair & Maintenance
    INSERT INTO public.service_types (business_id, name, description, interval_value, interval_unit, typical_fee, is_active)
    VALUES
      (v_business_id, 'Comprehensive Appliance Health Check', 'Electrical inspection, motor calibration & diagnostic check', 6, 'MONTHS', 999, true),
      (v_business_id, 'Refrigerator Coil & Compressor Service', 'Condenser coil cleaning, defrost test & gas pressure check', 6, 'MONTHS', 1200, true),
      (v_business_id, 'Washing Machine Descaling & Tub Clean', 'High-temperature descaling, drum balance & filter clean', 6, 'MONTHS', 1100, true),
      (v_business_id, 'Microwave & Oven Performance Check', 'Magnetron safety test, door seal audit & heating verification', 12, 'MONTHS', 800, true)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.message_templates (business_id, name, template_type, message_body)
    VALUES
      (v_business_id, 'Service Due Soon', 'DUE_SOON', 'Hi {{customer_name}}, this is {{business_name}}. Your scheduled {{service_name}} for {{asset_name}} is due on {{due_date}}. Would you like us to schedule a home visit this week?'),
      (v_business_id, 'Service Due Today', 'DUE_TODAY', 'Good morning {{customer_name}}! Your {{service_name}} with {{business_name}} is due today. Shall we send our technician today or tomorrow?'),
      (v_business_id, 'Service Overdue', 'OVERDUE', 'Hello {{customer_name}}, your {{service_name}} is overdue by {{days_overdue}} days. Preventive maintenance protects appliance lifespan and prevents breakdown. Reply to book your slot!'),
      (v_business_id, 'Booking Confirmation', 'BOOKING_CONFIRMATION', 'Hi {{customer_name}}, your service appointment with {{business_name}} is confirmed for {{booking_date}}. Our technician will call before arriving.'),
      (v_business_id, 'Service Completed', 'SERVICE_COMPLETED', 'Thank you {{customer_name}} for choosing {{business_name}}! Your {{service_name}} is complete. Your next periodic maintenance is scheduled for {{next_due_date}}.')
    ON CONFLICT DO NOTHING;

  ELSIF v_norm_type LIKE '%clean%' OR v_norm_type LIKE '%wash%' OR v_norm_type LIKE '%housekeeping%' THEN
    -- Home Cleaning & Deep Wash
    INSERT INTO public.service_types (business_id, name, description, interval_value, interval_unit, typical_fee, is_active)
    VALUES
      (v_business_id, 'Deep Home Sanitization & Cleaning', 'Full deep cleaning of floors, windows, balconies & high touchpoints', 3, 'MONTHS', 3500, true),
      (v_business_id, 'Kitchen & Chimney Degreasing', 'Deep degreasing of chimney filters, stovetop, tiles & countertops', 6, 'MONTHS', 1800, true),
      (v_business_id, 'Bathroom Deep Disinfection', 'Tile scrubbing, descaling, sanitaryware polishing & sanitization', 3, 'MONTHS', 1200, true),
      (v_business_id, 'Sofa & Mattress Shampooing', 'Fabric steam extraction, stain treatment & deodorization', 6, 'MONTHS', 1500, true)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.message_templates (business_id, name, template_type, message_body)
    VALUES
      (v_business_id, 'Service Due Soon', 'DUE_SOON', 'Hi {{customer_name}}, greetings from {{business_name}}! Your {{service_name}} for {{asset_name}} is due on {{due_date}}. Shall we reserve our cleaning crew for your preferred slot this week?'),
      (v_business_id, 'Service Due Today', 'DUE_TODAY', 'Good morning {{customer_name}}! Your scheduled {{service_name}} with {{business_name}} is due today. Shall we schedule our crew today or tomorrow?'),
      (v_business_id, 'Service Overdue', 'OVERDUE', 'Hello {{customer_name}}, your {{service_name}} is overdue by {{days_overdue}} days. Keep your spaces fresh, sanitized, and hygienic. Reply to schedule our team!'),
      (v_business_id, 'Booking Confirmation', 'BOOKING_CONFIRMATION', 'Hi {{customer_name}}, your cleaning service with {{business_name}} is confirmed for {{booking_date}}. Our crew will arrive fully equipped.'),
      (v_business_id, 'Service Completed', 'SERVICE_COMPLETED', 'Thank you {{customer_name}} for choosing {{business_name}}! Your {{service_name}} is finished. Your next cleaning cycle is scheduled for {{next_due_date}}.')
    ON CONFLICT DO NOTHING;

  ELSIF v_norm_type LIKE '%solar%' THEN
    -- Solar Panel Maintenance
    INSERT INTO public.service_types (business_id, name, description, interval_value, interval_unit, typical_fee, is_active)
    VALUES
      (v_business_id, 'Routine Panel Cleaning & De-dusting', 'De-ionized water wash, dust removal & visual crack inspection', 3, 'MONTHS', 1500, true),
      (v_business_id, 'Inverter & Electrical Wiring Audit', 'Inverter efficiency test, junction box check & DC cable inspection', 6, 'MONTHS', 2000, true),
      (v_business_id, 'Annual Solar Performance Check', 'Comprehensive generation yield test, earthing & structural integrity audit', 12, 'MONTHS', 3500, true)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.message_templates (business_id, name, template_type, message_body)
    VALUES
      (v_business_id, 'Service Due Soon', 'DUE_SOON', 'Hi {{customer_name}}, this is {{business_name}}. Your {{service_name}} for your solar installation is due on {{due_date}}. Clean panels generate up to 25% more power. Reply to schedule our team visit!'),
      (v_business_id, 'Service Due Today', 'DUE_TODAY', 'Good morning {{customer_name}}! Your {{service_name}} with {{business_name}} is due today. Shall we schedule our service team for today or tomorrow?'),
      (v_business_id, 'Service Overdue', 'OVERDUE', 'Hello {{customer_name}}, your {{service_name}} is overdue by {{days_overdue}} days. Dust buildup reduces solar generation daily. Reply to confirm your maintenance slot!'),
      (v_business_id, 'Booking Confirmation', 'BOOKING_CONFIRMATION', 'Hi {{customer_name}}, your solar maintenance visit with {{business_name}} is confirmed for {{booking_date}}. Our crew will arrive as scheduled.'),
      (v_business_id, 'Service Completed', 'SERVICE_COMPLETED', 'Thank you {{customer_name}} for choosing {{business_name}}! Your {{service_name}} is complete. Your next maintenance cycle is scheduled for {{next_due_date}}.')
    ON CONFLICT DO NOTHING;

  ELSIF v_norm_type LIKE '%electric%' OR v_norm_type LIKE '%plumb%' THEN
    -- General Electrical & Plumbing
    INSERT INTO public.service_types (business_id, name, description, interval_value, interval_unit, typical_fee, is_active)
    VALUES
      (v_business_id, 'Routine Electrical Safety Inspection', 'MCB test, switchboard thermal check & earthing resistance test', 6, 'MONTHS', 1000, true),
      (v_business_id, 'Plumbing Pipe & Leakage Audit', 'Pressure check, pipe joint inspection & drainage clearance', 6, 'MONTHS', 1200, true),
      (v_business_id, 'Water Tank Inspection & Cleaning', 'Overhead tank draining, mechanical scrubbing & UV sanitization', 6, 'MONTHS', 1800, true)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.message_templates (business_id, name, template_type, message_body)
    VALUES
      (v_business_id, 'Service Due Soon', 'DUE_SOON', 'Hi {{customer_name}}, greetings from {{business_name}}! Your scheduled {{service_name}} is due on {{due_date}}. Would you like us to schedule our technician to visit this week?'),
      (v_business_id, 'Service Due Today', 'DUE_TODAY', 'Good morning {{customer_name}}! Your {{service_name}} with {{business_name}} is due today. Shall we send our technician today or tomorrow?'),
      (v_business_id, 'Service Overdue', 'OVERDUE', 'Hello {{customer_name}}, your {{service_name}} is overdue by {{days_overdue}} days. Timely maintenance prevents electrical hazards and plumbing leaks. Reply to book your visit!'),
      (v_business_id, 'Booking Confirmation', 'BOOKING_CONFIRMATION', 'Hi {{customer_name}}, your service appointment with {{business_name}} is confirmed for {{booking_date}}. Our technician will call you before arriving.'),
      (v_business_id, 'Service Completed', 'SERVICE_COMPLETED', 'Thank you {{customer_name}} for choosing {{business_name}}! Your {{service_name}} is complete. Your next maintenance cycle is scheduled for {{next_due_date}}.')
    ON CONFLICT DO NOTHING;

  ELSIF v_norm_type LIKE '%air%' OR v_norm_type LIKE '%ac%' OR v_norm_type LIKE '%hvac%' OR v_norm_type LIKE '%cooling%' OR v_norm_type LIKE '%chill%' THEN
    -- Air Conditioning Maintenance
    INSERT INTO public.service_types (business_id, name, description, interval_value, interval_unit, typical_fee, is_active)
    VALUES
      (v_business_id, 'AC Periodic General Service', 'Standard filter wash, coil inspection & drainage flush', 6, 'MONTHS', 1200, true),
      (v_business_id, 'Deep Jet Chemical Foam Wash', 'High-pressure foam jet wash for heavy cooling restoration', 12, 'MONTHS', 1800, true),
      (v_business_id, 'Refrigerant Gas Leak & Top-up', 'Pressure test, leak sealing & Freon gas top-up', 12, 'MONTHS', 2200, true),
      (v_business_id, 'Annual Maintenance Contract (AMC)', 'Comprehensive quarterly routine visits & emergency breakdowns', 3, 'MONTHS', 3500, true),
      (v_business_id, 'Coil & Condenser Clean', 'Indoor evaporator & outdoor condenser coil decontamination', 6, 'MONTHS', 950, true)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.message_templates (business_id, name, template_type, message_body)
    VALUES
      (v_business_id, 'Service Due Soon', 'DUE_SOON', 'Hi {{customer_name}}, this is {{business_name}}. Your {{service_name}} for {{asset_name}} is due on {{due_date}}. Would you like us to schedule a technician visit this week?'),
      (v_business_id, 'Service Due Today', 'DUE_TODAY', 'Good morning {{customer_name}}! Your {{service_name}} with {{business_name}} is due today. Shall we send our technician today or tomorrow?'),
      (v_business_id, 'Service Overdue', 'OVERDUE', 'Hello {{customer_name}}, your {{service_name}} is overdue by {{days_overdue}} days. Delaying service may lead to higher electricity bills or cooling loss. Reply to book your slot!'),
      (v_business_id, 'Booking Confirmation', 'BOOKING_CONFIRMATION', 'Hi {{customer_name}}, your service appointment with {{business_name}} is confirmed for {{booking_date}}. Our technician will call you before arriving.'),
      (v_business_id, 'Service Completed', 'SERVICE_COMPLETED', 'Thank you {{customer_name}} for choosing {{business_name}}! Your {{service_name}} has been completed. Your next periodic maintenance is scheduled for {{next_due_date}}.')
    ON CONFLICT DO NOTHING;

  ELSE
    -- Generic / Other / Custom Business
    INSERT INTO public.service_types (business_id, name, description, interval_value, interval_unit, typical_fee, is_active)
    VALUES
      (v_business_id, 'Periodic Routine Service', 'Standard scheduled maintenance and routine operational check', 6, 'MONTHS', 1500, true),
      (v_business_id, 'Comprehensive Annual Inspection', 'In-depth diagnostic check and preventive servicing', 12, 'MONTHS', 2500, true),
      (v_business_id, 'Quarterly Preventive Health Check', 'Regular preventive checkup and performance tuning', 3, 'MONTHS', 1000, true),
      (v_business_id, 'Annual Contract Service (AMC)', 'Priority routine visits and emergency breakdown support', 12, 'MONTHS', 3500, true)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.message_templates (business_id, name, template_type, message_body)
    VALUES
      (v_business_id, 'Service Due Soon', 'DUE_SOON', 'Hi {{customer_name}}, greetings from {{business_name}}! Your scheduled {{service_name}} is due on {{due_date}}. Would you like us to arrange a service visit this week? Reply with your preferred day.'),
      (v_business_id, 'Service Due Today', 'DUE_TODAY', 'Good morning {{customer_name}}! Your scheduled {{service_name}} with {{business_name}} is due today. Shall we confirm an appointment for today or tomorrow?'),
      (v_business_id, 'Service Overdue', 'OVERDUE', 'Hello {{customer_name}}, your {{service_name}} is overdue by {{days_overdue}} days. Timely servicing keeps everything running smoothly and prevents costly repairs. Reply to book your slot!'),
      (v_business_id, 'Booking Confirmation', 'BOOKING_CONFIRMATION', 'Hi {{customer_name}}, your service appointment with {{business_name}} is confirmed for {{booking_date}}. We look forward to serving you.'),
      (v_business_id, 'Service Completed', 'SERVICE_COMPLETED', 'Thank you {{customer_name}} for choosing {{business_name}}! Your {{service_name}} has been completed. Your next periodic maintenance is scheduled for {{next_due_date}}.')
    ON CONFLICT DO NOTHING;

  END IF;

  -- 4. Record activity
  INSERT INTO public.activities (business_id, actor_user_id, action_type, description)
  VALUES (v_business_id, v_user_id, 'BUSINESS_CREATED', 'Created business account and initialized service catalog');

  RETURN to_jsonb(v_created_biz);
END;
$$;

-- 5. PERMISSIONS
REVOKE ALL ON FUNCTION public.create_business_and_owner(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_business_and_owner(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
