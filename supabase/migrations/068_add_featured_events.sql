-- Featured Events Migration
-- Adds is_featured column to events table for admin-controlled featured events

-- Add is_featured column to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Index for quick featured events lookups
CREATE INDEX IF NOT EXISTS idx_events_is_featured ON public.events(is_featured) WHERE is_featured = true;

-- Add comment for documentation
COMMENT ON COLUMN public.events.is_featured IS 'Admin-controlled flag to feature events on browse page. If no featured events exist, random events will be shown.';

