-- ============================================
-- DIAGNOSE EVENT DATA INTEGRITY
-- ============================================

DO $$
DECLARE
  ev RECORD;
  cnt INTEGER;
BEGIN
  -- Check event exists
  SELECT id, name, status, organizer_id, venue_id
  INTO ev
  FROM public.events
  WHERE id = 'a39470e8-88cb-4fe9-b3f4-3c2fb4527843';

  RAISE NOTICE '=== EVENT: % ===', ev.name;
  RAISE NOTICE 'Status: %', ev.status;
  RAISE NOTICE 'Organizer ID: %', ev.organizer_id;
  RAISE NOTICE 'Venue ID: %', ev.venue_id;

  -- Check organizer exists
  SELECT COUNT(*) INTO cnt FROM public.organizers WHERE id = ev.organizer_id;
  RAISE NOTICE 'Organizer exists: %', cnt > 0;

  -- Check venue exists (if set)
  IF ev.venue_id IS NOT NULL THEN
    SELECT COUNT(*) INTO cnt FROM public.venues WHERE id = ev.venue_id;
    RAISE NOTICE 'Venue exists: %', cnt > 0;
  ELSE
    RAISE NOTICE 'No venue set';
  END IF;

  -- Check event_promoters
  SELECT COUNT(*) INTO cnt FROM public.event_promoters WHERE event_id = ev.id;
  RAISE NOTICE 'Event promoters count: %', cnt;

  -- Check registrations
  SELECT COUNT(*) INTO cnt FROM public.registrations WHERE event_id = ev.id;
  RAISE NOTICE 'Registrations count: %', cnt;

  -- Check checkins
  SELECT COUNT(*) INTO cnt
  FROM public.checkins c
  JOIN public.registrations r ON r.id = c.registration_id
  WHERE r.event_id = ev.id;
  RAISE NOTICE 'Checkins count: %', cnt;

  -- Check payout_runs
  SELECT COUNT(*) INTO cnt FROM public.payout_runs WHERE event_id = ev.id;
  RAISE NOTICE 'Payout runs count: %', cnt;

END $$;
