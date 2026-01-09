-- ============================================
-- CHECK WHAT'S BLOCKING EVENT PUBLICATION
-- ============================================

DO $$
DECLARE
  ev RECORD;
BEGIN
  SELECT
    id, name, slug, status,
    venue_approval_status, venue_rejection_reason,
    start_time, end_time,
    registration_type
  INTO ev
  FROM public.events
  WHERE id = 'a39470e8-88cb-4fe9-b3f4-3c2fb4527843';

  RAISE NOTICE '=== EVENT PUBLISH CHECK ===';
  RAISE NOTICE 'Name: %', ev.name;
  RAISE NOTICE 'Slug: %', ev.slug;
  RAISE NOTICE 'Status: %', ev.status;
  RAISE NOTICE 'Venue Approval: %', ev.venue_approval_status;
  RAISE NOTICE 'Venue Rejection Reason: %', ev.venue_rejection_reason;
  RAISE NOTICE 'Start Time: %', ev.start_time;
  RAISE NOTICE 'End Time: %', ev.end_time;
  RAISE NOTICE 'Registration Type: %', ev.registration_type;
END $$;

-- Fix venue approval if needed
UPDATE public.events
SET venue_approval_status = 'approved'
WHERE id = 'a39470e8-88cb-4fe9-b3f4-3c2fb4527843'
  AND venue_approval_status != 'approved';
