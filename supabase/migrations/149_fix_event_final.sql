-- ============================================
-- FINAL FIX - Set event back to published
-- ============================================

-- Reset the event to published, unlock it, clear closed_at
UPDATE public.events
SET
  status = 'published',
  locked_at = NULL,
  closed_at = NULL,
  closed_by = NULL
WHERE id = 'a39470e8-88cb-4fe9-b3f4-3c2fb4527843';

-- Verify
DO $$
DECLARE
  ev RECORD;
BEGIN
  SELECT id, name, status, locked_at, closed_at
  INTO ev
  FROM public.events
  WHERE id = 'a39470e8-88cb-4fe9-b3f4-3c2fb4527843';

  RAISE NOTICE 'Event: %, Status: %, Locked: %, Closed: %', ev.name, ev.status, ev.locked_at, ev.closed_at;
END $$;
