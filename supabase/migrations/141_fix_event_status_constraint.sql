-- ============================================
-- FIX EVENT STATUS CONSTRAINT TO INCLUDE 'closed'
-- ============================================
-- The original constraint only allowed 'draft', 'published', 'ended'
-- The closeout feature needs 'closed' status
-- Migration 096 should have added this, but may not have run correctly

-- Drop any existing constraint (handle both named and auto-generated names)
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the constraint name for the status column
    SELECT c.conname INTO constraint_name
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.conrelid = 'public.events'::regclass
      AND c.contype = 'c'
      AND a.attname = 'status'
    LIMIT 1;

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.events DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END IF;
END $$;

-- Add the correct constraint with all valid status values
ALTER TABLE public.events
ADD CONSTRAINT events_status_check
CHECK (status IN ('draft', 'published', 'ended', 'closed'));

COMMENT ON CONSTRAINT events_status_check ON public.events IS
'Event lifecycle statuses: draft (not published), published (visible), ended (past event), closed (finalized with payouts)';
