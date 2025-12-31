-- Update commission_type constraint to allow 'enhanced' type
-- ============================================

ALTER TABLE public.event_promoters
DROP CONSTRAINT IF EXISTS event_promoters_commission_type_check;

ALTER TABLE public.event_promoters
ADD CONSTRAINT event_promoters_commission_type_check 
CHECK (commission_type IN ('flat_per_head', 'tiered_thresholds', 'enhanced'));

COMMENT ON COLUMN public.event_promoters.commission_type IS 'Commission model: flat_per_head (legacy), tiered_thresholds (legacy), or enhanced (new detailed payout system)';

