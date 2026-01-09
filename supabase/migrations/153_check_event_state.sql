-- Check current state of Mayfair event
DO $$
DECLARE
  ev RECORD;
  payout_count INTEGER;
  payout_line_count INTEGER;
BEGIN
  SELECT id, name, status, locked_at, closed_at, closed_by, venue_approval_status
  INTO ev
  FROM public.events
  WHERE id = 'a39470e8-88cb-4fe9-b3f4-3c2fb4527843';
  
  RAISE NOTICE '=== EVENT STATE ===';
  RAISE NOTICE 'Name: %', ev.name;
  RAISE NOTICE 'Status: %', ev.status;
  RAISE NOTICE 'Locked: %', ev.locked_at;
  RAISE NOTICE 'Closed: %', ev.closed_at;
  RAISE NOTICE 'Closed By: %', ev.closed_by;
  RAISE NOTICE 'Venue Approval: %', ev.venue_approval_status;
  
  -- Check payout runs
  SELECT COUNT(*) INTO payout_count
  FROM public.payout_runs
  WHERE event_id = 'a39470e8-88cb-4fe9-b3f4-3c2fb4527843';
  
  RAISE NOTICE '=== PAYOUTS ===';
  RAISE NOTICE 'Payout Runs: %', payout_count;
  
  -- Check payout lines
  SELECT COUNT(*) INTO payout_line_count
  FROM public.payout_lines pl
  JOIN public.payout_runs pr ON pl.payout_run_id = pr.id
  WHERE pr.event_id = 'a39470e8-88cb-4fe9-b3f4-3c2fb4527843';
  
  RAISE NOTICE 'Payout Lines: %', payout_line_count;
END $$;
