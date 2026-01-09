-- ============================================
-- DEBUG AND FIX SPECIFIC EVENT
-- ============================================

-- Check current state of the event
DO $$
DECLARE
  ev RECORD;
BEGIN
  SELECT id, name, status, locked_at, closed_at, closed_by
  INTO ev
  FROM public.events
  WHERE id = 'a39470e8-88cb-4fe9-b3f4-3c2fb4527843';

  IF ev.id IS NOT NULL THEN
    RAISE NOTICE 'Event found: %', ev.name;
    RAISE NOTICE 'Status: %', ev.status;
    RAISE NOTICE 'Locked at: %', ev.locked_at;
    RAISE NOTICE 'Closed at: %', ev.closed_at;
    RAISE NOTICE 'Closed by: %', ev.closed_by;
  ELSE
    RAISE NOTICE 'Event not found!';
  END IF;
END $$;

-- Force unlock and reset this specific event
UPDATE public.events
SET
  locked_at = NULL,
  closed_at = NULL,
  closed_by = NULL,
  status = 'published'
WHERE id = 'a39470e8-88cb-4fe9-b3f4-3c2fb4527843';

-- Delete any payout data for this event
DELETE FROM public.payout_lines
WHERE payout_run_id IN (
  SELECT id FROM public.payout_runs
  WHERE event_id = 'a39470e8-88cb-4fe9-b3f4-3c2fb4527843'
);

DELETE FROM public.payout_runs
WHERE event_id = 'a39470e8-88cb-4fe9-b3f4-3c2fb4527843';

-- Verify final state
DO $$
DECLARE
  ev RECORD;
BEGIN
  SELECT id, name, status, locked_at, closed_at
  INTO ev
  FROM public.events
  WHERE id = 'a39470e8-88cb-4fe9-b3f4-3c2fb4527843';

  RAISE NOTICE 'AFTER FIX - Status: %, Locked: %, Closed: %', ev.status, ev.locked_at, ev.closed_at;
END $$;
