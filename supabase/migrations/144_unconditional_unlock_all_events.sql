-- ============================================
-- UNCONDITIONAL UNLOCK - Remove ALL locks
-- ============================================

-- Remove locked_at from ALL events
UPDATE public.events
SET locked_at = NULL
WHERE locked_at IS NOT NULL;

-- Verify by selecting count
DO $$
DECLARE
  locked_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO locked_count FROM public.events WHERE locked_at IS NOT NULL;
  RAISE NOTICE 'Remaining locked events: %', locked_count;
END $$;
