-- Migration: Simplified attendee notes
-- Purpose: One note per attendee per organization (venue/organizer/promoter)
-- Each organization type can have exactly one note per attendee

-- Create attendee_notes table
CREATE TABLE IF NOT EXISTS public.attendee_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendee_id UUID REFERENCES public.attendees(id) ON DELETE CASCADE NOT NULL,
  -- Organization scope: exactly one of these should be set
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  organizer_id UUID REFERENCES public.organizers(id) ON DELETE CASCADE,
  promoter_id UUID REFERENCES public.promoters(id) ON DELETE CASCADE,
  -- Note content
  note TEXT NOT NULL DEFAULT '',
  -- Audit fields
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure exactly one organization is set
  CONSTRAINT check_single_organization CHECK (
    (venue_id IS NOT NULL AND organizer_id IS NULL AND promoter_id IS NULL) OR
    (venue_id IS NULL AND organizer_id IS NOT NULL AND promoter_id IS NULL) OR
    (venue_id IS NULL AND organizer_id IS NULL AND promoter_id IS NOT NULL)
  )
);

-- Unique constraints: one note per attendee per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendee_notes_venue_unique 
  ON public.attendee_notes(attendee_id, venue_id) WHERE venue_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendee_notes_organizer_unique 
  ON public.attendee_notes(attendee_id, organizer_id) WHERE organizer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendee_notes_promoter_unique 
  ON public.attendee_notes(attendee_id, promoter_id) WHERE promoter_id IS NOT NULL;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_attendee_notes_attendee_id 
  ON public.attendee_notes(attendee_id);
CREATE INDEX IF NOT EXISTS idx_attendee_notes_venue_id 
  ON public.attendee_notes(venue_id) WHERE venue_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attendee_notes_organizer_id 
  ON public.attendee_notes(organizer_id) WHERE organizer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attendee_notes_promoter_id 
  ON public.attendee_notes(promoter_id) WHERE promoter_id IS NOT NULL;

-- Add comments
COMMENT ON TABLE public.attendee_notes IS 'Simple notes per attendee per organization - one note per venue/organizer/promoter';
COMMENT ON COLUMN public.attendee_notes.venue_id IS 'If set, this note belongs to a venue';
COMMENT ON COLUMN public.attendee_notes.organizer_id IS 'If set, this note belongs to an organizer';
COMMENT ON COLUMN public.attendee_notes.promoter_id IS 'If set, this note belongs to a promoter';

-- Enable RLS
ALTER TABLE public.attendee_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Venue users can manage their venue's notes
CREATE POLICY "Venue users can view their venue notes"
  ON public.attendee_notes FOR SELECT
  USING (
    venue_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.venue_users vu
      WHERE vu.venue_id = attendee_notes.venue_id
      AND vu.user_id = auth.uid()
    )
  );

CREATE POLICY "Venue users can insert their venue notes"
  ON public.attendee_notes FOR INSERT
  WITH CHECK (
    venue_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.venue_users vu
      WHERE vu.venue_id = attendee_notes.venue_id
      AND vu.user_id = auth.uid()
    )
  );

CREATE POLICY "Venue users can update their venue notes"
  ON public.attendee_notes FOR UPDATE
  USING (
    venue_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.venue_users vu
      WHERE vu.venue_id = attendee_notes.venue_id
      AND vu.user_id = auth.uid()
    )
  );

-- Organizer users can manage their organizer's notes
CREATE POLICY "Organizer users can view their organizer notes"
  ON public.attendee_notes FOR SELECT
  USING (
    organizer_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.organizer_users ou
      WHERE ou.organizer_id = attendee_notes.organizer_id
      AND ou.user_id = auth.uid()
    )
  );

CREATE POLICY "Organizer users can insert their organizer notes"
  ON public.attendee_notes FOR INSERT
  WITH CHECK (
    organizer_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.organizer_users ou
      WHERE ou.organizer_id = attendee_notes.organizer_id
      AND ou.user_id = auth.uid()
    )
  );

CREATE POLICY "Organizer users can update their organizer notes"
  ON public.attendee_notes FOR UPDATE
  USING (
    organizer_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.organizer_users ou
      WHERE ou.organizer_id = attendee_notes.organizer_id
      AND ou.user_id = auth.uid()
    )
  );

-- Promoters can manage their own notes
CREATE POLICY "Promoters can view their own notes"
  ON public.attendee_notes FOR SELECT
  USING (
    promoter_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.promoters p
      WHERE p.id = attendee_notes.promoter_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Promoters can insert their own notes"
  ON public.attendee_notes FOR INSERT
  WITH CHECK (
    promoter_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.promoters p
      WHERE p.id = attendee_notes.promoter_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Promoters can update their own notes"
  ON public.attendee_notes FOR UPDATE
  USING (
    promoter_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.promoters p
      WHERE p.id = attendee_notes.promoter_id
      AND p.user_id = auth.uid()
    )
  );

-- Service role bypass
CREATE POLICY "Service role full access to attendee_notes"
  ON public.attendee_notes FOR ALL
  USING (auth.role() = 'service_role');
