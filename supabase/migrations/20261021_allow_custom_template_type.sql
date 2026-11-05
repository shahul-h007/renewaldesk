-- Migration: 20261021_allow_custom_template_type.sql
-- Description: Expand public.message_templates check constraint to allow 'CUSTOM' template_type.
-- Author: RenewalDesk Phase 3
-- Forward-only, non-destructive migration. Preserves all existing message templates and tenant data.

DO $$
BEGIN
  -- 1. Safely drop the existing constraint if present
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'message_templates_template_type_check'
      AND conrelid = 'public.message_templates'::regclass
  ) THEN
    ALTER TABLE public.message_templates DROP CONSTRAINT message_templates_template_type_check;
  END IF;

  -- 2. Re-create constraint allowing the 5 core lifecycle types plus 'CUSTOM'
  ALTER TABLE public.message_templates
    ADD CONSTRAINT message_templates_template_type_check
    CHECK (template_type IN (
      'DUE_SOON',
      'DUE_TODAY',
      'OVERDUE',
      'BOOKING_CONFIRMATION',
      'SERVICE_COMPLETED',
      'CUSTOM'
    ));
END $$;
