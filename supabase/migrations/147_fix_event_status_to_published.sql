-- Set event back to published status
UPDATE public.events
SET status = 'published'
WHERE id = 'a39470e8-88cb-4fe9-b3f4-3c2fb4527843';

-- Verify
DO $$
DECLARE
  ev_status TEXT;
BEGIN
  SELECT status INTO ev_status FROM public.events WHERE id = 'a39470e8-88cb-4fe9-b3f4-3c2fb4527843';
  RAISE NOTICE 'Event status is now: %', ev_status;
END $$;
