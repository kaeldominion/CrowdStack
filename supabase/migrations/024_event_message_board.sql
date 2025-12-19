-- Event Message Board
-- Allows real-time messaging/announcements for live events
-- Messages are visible to all users with access to the event

-- Create event_messages table
CREATE TABLE IF NOT EXISTS public.event_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,  -- Denormalized for quick display
  sender_email TEXT,  -- Denormalized for quick display
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_event_messages_event_id ON public.event_messages(event_id);
CREATE INDEX idx_event_messages_created_at ON public.event_messages(created_at DESC);
CREATE INDEX idx_event_messages_sender_id ON public.event_messages(sender_id);

-- Enable RLS
ALTER TABLE public.event_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users with access to the event can read messages
-- This follows the same access rules as events (venue, organizer, door_staff, superadmin)
CREATE POLICY "Event access users can read messages"
  ON public.event_messages FOR SELECT
  USING (
    -- Superadmin can read all
    public.user_is_superadmin(auth.uid())
    OR
    -- Venue admin can read messages for events at their venue
    (public.user_has_role(auth.uid(), 'venue_admin'::user_role)
     AND EXISTS (
       SELECT 1
       FROM public.events e
       JOIN public.venues v ON e.venue_id = v.id
       WHERE e.id = event_messages.event_id
       AND v.id = public.get_user_venue_id(auth.uid())
     ))
    OR
    -- Organizer can read messages for their events
    (public.user_has_role(auth.uid(), 'event_organizer'::user_role)
     AND EXISTS (
       SELECT 1
       FROM public.events e
       WHERE e.id = event_messages.event_id
       AND e.organizer_id = public.get_user_organizer_id(auth.uid())
     ))
    OR
    -- Door staff can read messages for events they have access to
    (public.user_has_role(auth.uid(), 'door_staff'::user_role)
     AND EXISTS (
       SELECT 1
       FROM public.events e
       WHERE e.id = event_messages.event_id
     ))
  );

-- RLS Policy: Users with access to the event can post messages
CREATE POLICY "Event access users can post messages"
  ON public.event_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      -- Superadmin can post to any event
      public.user_is_superadmin(auth.uid())
      OR
      -- Venue admin can post to events at their venue
      (public.user_has_role(auth.uid(), 'venue_admin'::user_role)
       AND EXISTS (
         SELECT 1
         FROM public.events e
         JOIN public.venues v ON e.venue_id = v.id
         WHERE e.id = event_id
         AND v.id = public.get_user_venue_id(auth.uid())
       ))
      OR
      -- Organizer can post to their events
      (public.user_has_role(auth.uid(), 'event_organizer'::user_role)
       AND EXISTS (
         SELECT 1
         FROM public.events e
         WHERE e.id = event_id
         AND e.organizer_id = public.get_user_organizer_id(auth.uid())
       ))
      OR
      -- Door staff can post to events they have access to
      (public.user_has_role(auth.uid(), 'door_staff'::user_role)
       AND EXISTS (
         SELECT 1
         FROM public.events e
         WHERE e.id = event_id
       ))
    )
  );

-- RLS Policy: Users can update/delete their own messages
CREATE POLICY "Users can update their own messages"
  ON public.event_messages FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can delete their own messages"
  ON public.event_messages FOR DELETE
  USING (sender_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_event_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_event_messages_updated_at
  BEFORE UPDATE ON public.event_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_event_messages_updated_at();

