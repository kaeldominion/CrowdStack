-- ============================================
-- FORCE UNLOCK EVENTS THAT AREN'T PROPERLY CLOSED
-- ============================================

-- Unlock events that are locked but have NO valid payout_runs
-- (indicating closeout didn't complete successfully)
UPDATE public.events
SET
  locked_at = NULL,
  closed_at = NULL,
  closed_by = NULL
WHERE locked_at IS NOT NULL
  AND id NOT IN (
    SELECT DISTINCT event_id FROM public.payout_runs
    WHERE event_id IS NOT NULL
  );

-- Also unlock events that are locked but not in 'closed' status
UPDATE public.events
SET
  locked_at = NULL,
  closed_at = NULL,
  closed_by = NULL
WHERE locked_at IS NOT NULL
  AND status != 'closed';
