-- Migration: Add notes column to registrations table
-- Purpose: Allow organizers/venues to add notes to individual attendee registrations

-- Add notes column to registrations
ALTER TABLE public.registrations
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;

-- Add index for searching notes (optional, for large events)
CREATE INDEX IF NOT EXISTS idx_registrations_notes_search
ON public.registrations USING gin(to_tsvector('english', COALESCE(notes, '')))
WHERE notes IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.registrations.notes IS 'Internal notes about this registration (visible to organizers/venues only)';
