-- Fix table_commission_type CHECK constraint to properly allow NULL values
-- PostgreSQL CHECK with NULL IN (...) doesn't work as expected because NULL comparisons return NULL/unknown
-- The fix is to use IS NULL OR IN (...) pattern

-- ============================================
-- 1. FIX CONSTRAINT ON PROMOTER_PAYOUT_TEMPLATES
-- ============================================

-- Drop any existing constraints on this column (handles auto-generated names)
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'promoter_payout_templates'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%table_commission_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.promoter_payout_templates DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;

-- Add the corrected constraint
ALTER TABLE public.promoter_payout_templates
ADD CONSTRAINT promoter_payout_templates_table_commission_type_check
CHECK (table_commission_type IS NULL OR table_commission_type IN ('percentage', 'flat_fee'));

-- ============================================
-- 2. FIX CONSTRAINT ON EVENT_PROMOTERS
-- ============================================

-- Drop any existing constraints on this column (handles auto-generated names)
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'event_promoters'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%table_commission_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.event_promoters DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;

-- Add the corrected constraint
ALTER TABLE public.event_promoters
ADD CONSTRAINT event_promoters_table_commission_type_check
CHECK (table_commission_type IS NULL OR table_commission_type IN ('percentage', 'flat_fee'));
