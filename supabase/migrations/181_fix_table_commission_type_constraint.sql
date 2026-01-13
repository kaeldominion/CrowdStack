-- Fix table_commission_type CHECK constraint to properly allow NULL values
-- Also ensures columns exist (migration 164 may not have been applied)
-- PostgreSQL CHECK with NULL IN (...) doesn't work as expected because NULL comparisons return NULL/unknown
-- The fix is to use IS NULL OR IN (...) pattern

-- ============================================
-- 1. ENSURE COLUMNS EXIST ON PROMOTER_PAYOUT_TEMPLATES
-- ============================================

-- Add columns if they don't exist (from migration 164)
ALTER TABLE public.promoter_payout_templates
ADD COLUMN IF NOT EXISTS table_commission_type TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS table_commission_rate DECIMAL(5, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS table_commission_flat_fee DECIMAL(10, 2) DEFAULT NULL;

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

COMMENT ON COLUMN public.promoter_payout_templates.table_commission_type IS 'Type of table commission: percentage (of table spend) or flat_fee (per table booked)';
COMMENT ON COLUMN public.promoter_payout_templates.table_commission_rate IS 'Percentage commission on table spend (0-100). Used when table_commission_type is percentage.';
COMMENT ON COLUMN public.promoter_payout_templates.table_commission_flat_fee IS 'Flat fee per table booked. Used when table_commission_type is flat_fee.';

-- ============================================
-- 2. ENSURE COLUMNS EXIST ON EVENT_PROMOTERS
-- ============================================

-- Add columns if they don't exist (from migration 164)
ALTER TABLE public.event_promoters
ADD COLUMN IF NOT EXISTS table_commission_type TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS table_commission_rate DECIMAL(5, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS table_commission_flat_fee DECIMAL(10, 2) DEFAULT NULL;

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

COMMENT ON COLUMN public.event_promoters.table_commission_type IS 'Type of table commission: percentage (of table spend) or flat_fee (per table booked)';
COMMENT ON COLUMN public.event_promoters.table_commission_rate IS 'Percentage commission on table spend (0-100). Used when table_commission_type is percentage.';
COMMENT ON COLUMN public.event_promoters.table_commission_flat_fee IS 'Flat fee per table booked. Used when table_commission_type is flat_fee.';

-- ============================================
-- 3. ENSURE COLUMNS EXIST ON PAYOUT_LINES
-- ============================================

-- Add columns if they don't exist (from migration 164)
ALTER TABLE public.payout_lines
ADD COLUMN IF NOT EXISTS table_commission_amount DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tables_count INTEGER DEFAULT 0;

COMMENT ON COLUMN public.payout_lines.table_commission_amount IS 'Total commission earned from table bookings';
COMMENT ON COLUMN public.payout_lines.tables_count IS 'Number of tables booked by this promoter';
