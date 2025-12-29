-- Add is_headliner field to event_lineups table
ALTER TABLE public.event_lineups
  ADD COLUMN IF NOT EXISTS is_headliner BOOLEAN DEFAULT FALSE;

-- Create index for headliner queries
CREATE INDEX IF NOT EXISTS idx_event_lineups_headliner 
  ON public.event_lineups(event_id, is_headliner) 
  WHERE is_headliner = TRUE;

COMMENT ON COLUMN public.event_lineups.is_headliner IS 'Whether this DJ is a headliner for the event';



