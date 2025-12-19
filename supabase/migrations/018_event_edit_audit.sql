-- Event Edit Audit Log
-- Tracks all edits made to events for accountability

-- ============================================
-- EVENT EDITS AUDIT TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.event_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  edited_by UUID NOT NULL REFERENCES auth.users(id),
  editor_role TEXT NOT NULL, -- 'venue_admin', 'event_organizer', 'superadmin'
  editor_entity_id UUID, -- venue_id or organizer_id depending on role
  changes JSONB NOT NULL, -- { field: { old: value, new: value } }
  reason TEXT, -- Optional reason for edit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_edits_event_id ON public.event_edits(event_id);
CREATE INDEX IF NOT EXISTS idx_event_edits_edited_by ON public.event_edits(edited_by);
CREATE INDEX IF NOT EXISTS idx_event_edits_created_at ON public.event_edits(created_at DESC);

-- Enable RLS
ALTER TABLE public.event_edits ENABLE ROW LEVEL SECURITY;

-- Venue admins can read edits for events at their venue
CREATE POLICY "Venue admins can read event edits for their venue"
  ON public.event_edits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.venue_users vu ON vu.venue_id = e.venue_id
      WHERE e.id = event_edits.event_id
      AND vu.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.venues v ON v.id = e.venue_id
      WHERE e.id = event_edits.event_id
      AND v.created_by = auth.uid()
    )
  );

-- Organizers can read edits for their events
CREATE POLICY "Organizers can read event edits for their events"
  ON public.event_edits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organizer_users ou ON ou.organizer_id = e.organizer_id
      WHERE e.id = event_edits.event_id
      AND ou.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organizers o ON o.id = e.organizer_id
      WHERE e.id = event_edits.event_id
      AND o.created_by = auth.uid()
    )
  );

-- Superadmins can read all edits
CREATE POLICY "Superadmins can read all event edits"
  ON public.event_edits FOR SELECT
  USING (public.user_is_superadmin(auth.uid()));

COMMENT ON TABLE public.event_edits IS 'Audit log of all event edits with before/after values';
COMMENT ON COLUMN public.event_edits.changes IS 'JSON object containing field changes: { fieldName: { old: value, new: value } }';
COMMENT ON COLUMN public.event_edits.editor_role IS 'Role of user who made the edit: venue_admin, event_organizer, or superadmin';

