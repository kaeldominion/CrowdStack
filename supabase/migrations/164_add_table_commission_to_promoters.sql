-- Add table booking commission options to promoter templates and event_promoters
-- Supports both percentage commission and flat fee per table

-- ============================================
-- 1. ADD TABLE COMMISSION FIELDS TO PROMOTER_PAYOUT_TEMPLATES
-- ============================================

ALTER TABLE public.promoter_payout_templates
ADD COLUMN IF NOT EXISTS table_commission_type TEXT CHECK (table_commission_type IN ('percentage', 'flat_fee', NULL)),
ADD COLUMN IF NOT EXISTS table_commission_rate DECIMAL(5, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS table_commission_flat_fee DECIMAL(10, 2) DEFAULT NULL;

COMMENT ON COLUMN public.promoter_payout_templates.table_commission_type IS 'Type of table commission: percentage (of table spend) or flat_fee (per table booked)';
COMMENT ON COLUMN public.promoter_payout_templates.table_commission_rate IS 'Percentage commission on table spend (0-100). Used when table_commission_type is percentage.';
COMMENT ON COLUMN public.promoter_payout_templates.table_commission_flat_fee IS 'Flat fee per table booked. Used when table_commission_type is flat_fee.';

-- ============================================
-- 2. ADD TABLE COMMISSION FIELDS TO EVENT_PROMOTERS
-- ============================================

ALTER TABLE public.event_promoters
ADD COLUMN IF NOT EXISTS table_commission_type TEXT CHECK (table_commission_type IN ('percentage', 'flat_fee', NULL)),
ADD COLUMN IF NOT EXISTS table_commission_rate DECIMAL(5, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS table_commission_flat_fee DECIMAL(10, 2) DEFAULT NULL;

COMMENT ON COLUMN public.event_promoters.table_commission_type IS 'Type of table commission: percentage (of table spend) or flat_fee (per table booked)';
COMMENT ON COLUMN public.event_promoters.table_commission_rate IS 'Percentage commission on table spend (0-100). Used when table_commission_type is percentage.';
COMMENT ON COLUMN public.event_promoters.table_commission_flat_fee IS 'Flat fee per table booked. Used when table_commission_type is flat_fee.';

-- ============================================
-- 3. ADD TABLE COMMISSION FIELDS TO PAYOUT_LINES
-- ============================================

ALTER TABLE public.payout_lines
ADD COLUMN IF NOT EXISTS table_commission_amount DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tables_count INTEGER DEFAULT 0;

COMMENT ON COLUMN public.payout_lines.table_commission_amount IS 'Total commission earned from table bookings';
COMMENT ON COLUMN public.payout_lines.tables_count IS 'Number of tables booked by this promoter';
