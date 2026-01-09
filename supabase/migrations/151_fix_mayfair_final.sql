-- Check and fix the Mayfair event state
-- Event ID: a39470e8-88cb-4fe9-b3f4-3c2fb4527843

-- First, let's see the current state
DO $$
DECLARE
  ev RECORD;
BEGIN
  SELECT id, name, status, locked_at, closed_at, closed_by, venue_approval_status
  INTO ev
  FROM public.events
  WHERE id = 'a39470e8-88cb-4fe9-b3f4-3c2fb4527843';
  
  RAISE NOTICE 'Current state:';
  RAISE NOTICE '  Status: %', ev.status;
  RAISE NOTICE '  Locked: %', ev.locked_at;
  RAISE NOTICE '  Closed: %', ev.closed_at;
  RAISE NOTICE '  Venue Approval: %', ev.venue_approval_status;
END $$;

-- Fix the event: unlock it, set to published (or ended since date passed), ensure venue approved
UPDATE public.events
SET
  status = 'ended',  -- ended is correct since the event date has passed
  locked_at = NULL,
  closed_at = NULL,
  closed_by = NULL,
  venue_approval_status = 'approved'
WHERE id = 'a39470e8-88cb-4fe9-b3f4-3c2fb4527843';

-- Delete any orphaned payout data so closeout can be retried fresh
DELETE FROM public.payout_lines
WHERE payout_run_id IN (
  SELECT id FROM public.payout_runs
  WHERE event_id = 'a39470e8-88cb-4fe9-b3f4-3c2fb4527843'
);

DELETE FROM public.payout_runs
WHERE event_id = 'a39470e8-88cb-4fe9-b3f4-3c2fb4527843';

-- Verify the fix
DO $$
DECLARE
  ev RECORD;
BEGIN
  SELECT id, name, status, locked_at, closed_at, venue_approval_status
  INTO ev
  FROM public.events
  WHERE id = 'a39470e8-88cb-4fe9-b3f4-3c2fb4527843';
  
  RAISE NOTICE 'After fix:';
  RAISE NOTICE '  Status: %', ev.status;
  RAISE NOTICE '  Locked: %', ev.locked_at;
  RAISE NOTICE '  Closed: %', ev.closed_at;
  RAISE NOTICE '  Venue Approval: %', ev.venue_approval_status;
END $$;
