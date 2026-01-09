-- Fix Mayfair event: set status back to published
-- "ended" is now determined by date, not status field

UPDATE public.events
SET status = 'published'
WHERE id = 'a39470e8-88cb-4fe9-b3f4-3c2fb4527843';

-- Also fix any other events that might have "ended" status - they should be "published"
-- (only if they were visible before)
UPDATE public.events
SET status = 'published'
WHERE status = 'ended';

-- Verify
DO $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt FROM public.events WHERE status = 'ended';
  RAISE NOTICE 'Events with ended status: %', cnt;
END $$;
