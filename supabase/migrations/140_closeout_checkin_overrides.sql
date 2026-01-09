-- ============================================
-- CLOSEOUT CHECKIN OVERRIDES
-- ============================================
-- Allow organizers to manually override check-in counts during closeout
-- when promoters report missed check-ins

-- Add manual checkin override fields to event_promoters
ALTER TABLE public.event_promoters
  ADD COLUMN IF NOT EXISTS manual_checkins_override INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS manual_checkins_reason TEXT DEFAULT NULL;

-- Add comment explaining the fields
COMMENT ON COLUMN public.event_promoters.manual_checkins_override IS
  'Manual override for check-in count. If set, this value is used instead of the actual checked_in count from registrations.';

COMMENT ON COLUMN public.event_promoters.manual_checkins_reason IS
  'Reason for the manual checkin override, required for audit trail.';
