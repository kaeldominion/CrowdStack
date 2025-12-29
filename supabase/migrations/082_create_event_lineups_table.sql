-- Create Event Lineups table
-- This migration creates the event_lineups table for linking DJs to events with ordering

CREATE TABLE IF NOT EXISTS public.event_lineups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  dj_id UUID NOT NULL REFERENCES public.djs(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  set_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, dj_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_lineups_event_id ON public.event_lineups(event_id);
CREATE INDEX IF NOT EXISTS idx_event_lineups_dj_id ON public.event_lineups(dj_id);
CREATE INDEX IF NOT EXISTS idx_event_lineups_display_order ON public.event_lineups(event_id, display_order);

-- Enable RLS
ALTER TABLE public.event_lineups ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Public can view event lineups
CREATE POLICY "Public can view event lineups"
  ON public.event_lineups
  FOR SELECT
  USING (true);

-- Event owners (organizers/venue admins) can manage lineups
-- Check if user is organizer of the event
CREATE POLICY "Organizers can manage event lineups"
  ON public.event_lineups
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      INNER JOIN public.organizers o ON o.id = e.organizer_id
      INNER JOIN public.organizer_users ou ON ou.organizer_id = o.id
      WHERE e.id = event_lineups.event_id
      AND ou.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_lineups.event_id
      AND e.organizer_id IN (
        SELECT id FROM public.organizers WHERE created_by = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      INNER JOIN public.organizers o ON o.id = e.organizer_id
      INNER JOIN public.organizer_users ou ON ou.organizer_id = o.id
      WHERE e.id = event_lineups.event_id
      AND ou.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_lineups.event_id
      AND e.organizer_id IN (
        SELECT id FROM public.organizers WHERE created_by = auth.uid()
      )
    )
  );

-- Venue admins can manage lineups for events at their venues
CREATE POLICY "Venue admins can manage event lineups"
  ON public.event_lineups
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_lineups.event_id
      AND e.venue_id IN (
        SELECT venue_id FROM public.venue_users WHERE user_id = auth.uid()
        UNION
        SELECT id FROM public.venues WHERE created_by = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_lineups.event_id
      AND e.venue_id IN (
        SELECT venue_id FROM public.venue_users WHERE user_id = auth.uid()
        UNION
        SELECT id FROM public.venues WHERE created_by = auth.uid()
      )
    )
  );

-- Superadmins can do everything
CREATE POLICY "Superadmins can manage all event lineups"
  ON public.event_lineups
  FOR ALL
  USING (public.user_is_superadmin(auth.uid()))
  WITH CHECK (public.user_is_superadmin(auth.uid()));

COMMENT ON TABLE public.event_lineups IS 'DJs in event lineups with ordering and optional set times';

