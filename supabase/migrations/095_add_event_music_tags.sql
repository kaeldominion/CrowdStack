-- Add Music Tags Support for Events
-- Similar to venue_tags, but only for music genres
-- ============================================

-- Create event_tags table (only for music tags)
CREATE TABLE IF NOT EXISTS public.event_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  tag_type TEXT NOT NULL DEFAULT 'music' CHECK (tag_type = 'music'),
  tag_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, tag_type, tag_value)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_event_tags_event_id ON public.event_tags(event_id);
CREATE INDEX IF NOT EXISTS idx_event_tags_type ON public.event_tags(event_id, tag_type);
CREATE INDEX IF NOT EXISTS idx_event_tags_value ON public.event_tags(tag_type, tag_value);

-- RLS Policies
-- Public can read event tags
CREATE POLICY "Public can read event tags"
  ON public.event_tags FOR SELECT
  USING (true);

-- Organizers can manage tags for their events
CREATE POLICY "Organizers can manage their event tags"
  ON public.event_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_tags.event_id
      AND events.organizer_id IN (
        SELECT id FROM public.organizers WHERE created_by = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_tags.event_id
      AND events.organizer_id IN (
        SELECT id FROM public.organizers WHERE created_by = auth.uid()
      )
    )
  );

-- Venue admins can manage tags for events at their venue
CREATE POLICY "Venue admins can manage tags for their venue events"
  ON public.event_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_tags.event_id
      AND events.venue_id IN (
        SELECT id FROM public.venues WHERE created_by = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_tags.event_id
      AND events.venue_id IN (
        SELECT id FROM public.venues WHERE created_by = auth.uid()
      )
    )
  );

COMMENT ON TABLE public.event_tags IS 'Music tags for events. Tag values should use VENUE_EVENT_GENRES constant.';

