-- Migration: Add registration notes history table
-- Purpose: Track notes with date, time, user, and organization scope (venue vs organizer)

-- Create registration_notes_history table
CREATE TABLE IF NOT EXISTS public.registration_notes_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES public.registrations(id) ON DELETE CASCADE NOT NULL,
  note_text TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Organization scope: one of these will be set
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  organizer_id UUID REFERENCES public.organizers(id) ON DELETE CASCADE,
  -- Ensure at least one organization is set
  CONSTRAINT check_organization_scope CHECK (
    (venue_id IS NOT NULL AND organizer_id IS NULL) OR
    (venue_id IS NULL AND organizer_id IS NOT NULL)
  )
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_registration_notes_history_registration_id 
  ON public.registration_notes_history(registration_id);
CREATE INDEX IF NOT EXISTS idx_registration_notes_history_venue_id 
  ON public.registration_notes_history(venue_id) WHERE venue_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_registration_notes_history_organizer_id 
  ON public.registration_notes_history(organizer_id) WHERE organizer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_registration_notes_history_created_at 
  ON public.registration_notes_history(created_at DESC);

-- Add comments
COMMENT ON TABLE public.registration_notes_history IS 'History of notes added to registrations, scoped by organization (venue or organizer)';
COMMENT ON COLUMN public.registration_notes_history.venue_id IS 'If set, this note is only visible to venue users';
COMMENT ON COLUMN public.registration_notes_history.organizer_id IS 'If set, this note is only visible to organizer users';
