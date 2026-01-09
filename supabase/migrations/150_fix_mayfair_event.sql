-- Fix the Mayfair event so closeout can be run again
-- Unlock it, clear closed_at, keep status as ended (that's correct)

UPDATE public.events
SET
  locked_at = NULL,
  closed_at = NULL,
  closed_by = NULL
WHERE id = 'a39470e8-88cb-4fe9-b3f4-3c2fb4527843';

-- Delete any orphaned payout data so closeout can create fresh payouts
DELETE FROM public.payout_lines
WHERE payout_run_id IN (
  SELECT id FROM public.payout_runs
  WHERE event_id = 'a39470e8-88cb-4fe9-b3f4-3c2fb4527843'
);

DELETE FROM public.payout_runs
WHERE event_id = 'a39470e8-88cb-4fe9-b3f4-3c2fb4527843';

-- Verify
DO $$
DECLARE
  ev RECORD;
BEGIN
  SELECT status, locked_at, closed_at FROM public.events
  WHERE id = 'a39470e8-88cb-4fe9-b3f4-3c2fb4527843' INTO ev;
  RAISE NOTICE 'Event status: %, locked: %, closed: %', ev.status, ev.locked_at, ev.closed_at;
END $$;
