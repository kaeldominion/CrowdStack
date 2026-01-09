-- ============================================
-- UNLOCK EVENTS THAT FAILED DURING CLOSEOUT
-- ============================================
-- Events that have locked_at set but status is not 'closed'
-- indicate a failed closeout attempt

-- Unlock events where closeout failed (locked but not closed)
UPDATE public.events
SET locked_at = NULL, closed_at = NULL, closed_by = NULL
WHERE locked_at IS NOT NULL
  AND status != 'closed';

-- Also clean up orphaned payout_runs for events that didn't fully close
DELETE FROM public.payout_lines
WHERE payout_run_id IN (
  SELECT pr.id FROM public.payout_runs pr
  JOIN public.events e ON e.id = pr.event_id
  WHERE e.status != 'closed'
);

DELETE FROM public.payout_runs
WHERE event_id IN (
  SELECT id FROM public.events WHERE status != 'closed'
);
