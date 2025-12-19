-- Event Message Board
-- A shared message board for live mission control where all authorized users can read and post messages

-- Create event_message_board table
CREATE TABLE IF NOT EXISTS public.event_message_board (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_email TEXT, -- Denormalized for display
  author_name TEXT, -- Denormalized for display
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete
);

-- Indexes for performance
CREATE INDEX idx_event_message_board_event_id ON public.event_message_board(event_id);
CREATE INDEX idx_event_message_board_created_at ON public.event_message_board(created_at DESC);
CREATE INDEX idx_event_message_board_author_id ON public.event_message_board(author_id);

-- Enable RLS
ALTER TABLE public.event_message_board ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone with access to the event can read messages
-- (Users with door_staff, event_organizer, venue_admin, or superadmin roles)
CREATE POLICY "Event access users can read messages"
  ON public.event_message_board FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      -- Superadmin can read all
      public.user_is_superadmin(auth.uid())
      OR
      -- Door staff can read messages for events they have access to
      (public.user_has_role(auth.uid(), 'door_staff'::user_role)
       AND EXISTS (
         SELECT 1 FROM public.events e
         WHERE e.id = event_message_board.event_id
       ))
      OR
      -- Organizers can read messages for their events
      (public.user_has_role(auth.uid(), 'event_organizer'::user_role)
       AND EXISTS (
         SELECT 1 FROM public.events e
         WHERE e.id = event_message_board.event_id
         AND e.organizer_id = public.get_user_organizer_id(auth.uid())
       ))
      OR
      -- Venue admins can read messages for events at their venue
      (public.user_has_role(auth.uid(), 'venue_admin'::user_role)
       AND EXISTS (
         SELECT 1 FROM public.events e
         WHERE e.id = event_message_board.event_id
         AND e.venue_id = public.get_user_venue_id(auth.uid())
       ))
    )
  );

-- RLS Policy: Anyone with access to the event can create messages
CREATE POLICY "Event access users can create messages"
  ON public.event_message_board FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND (
      public.user_is_superadmin(auth.uid())
      OR
      public.user_has_role(auth.uid(), 'door_staff'::user_role)
      OR
      (public.user_has_role(auth.uid(), 'event_organizer'::user_role)
       AND EXISTS (
         SELECT 1 FROM public.events e
         WHERE e.id = event_message_board.event_id
         AND e.organizer_id = public.get_user_organizer_id(auth.uid())
       ))
      OR
      (public.user_has_role(auth.uid(), 'venue_admin'::user_role)
       AND EXISTS (
         SELECT 1 FROM public.events e
         WHERE e.id = event_message_board.event_id
         AND e.venue_id = public.get_user_venue_id(auth.uid())
       ))
    )
  );

-- RLS Policy: Users can update their own messages
CREATE POLICY "Users can update their own messages"
  ON public.event_message_board FOR UPDATE
  USING (author_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (author_id = auth.uid());

-- RLS Policy: Users can soft-delete their own messages
CREATE POLICY "Users can delete their own messages"
  ON public.event_message_board FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (
    author_id = auth.uid()
    AND (deleted_at IS NOT NULL OR TRUE) -- Allow setting deleted_at
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_event_message_board_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER event_message_board_updated_at
  BEFORE UPDATE ON public.event_message_board
  FOR EACH ROW
  EXECUTE FUNCTION update_event_message_board_updated_at();

-- Comments
COMMENT ON TABLE public.event_message_board IS 
  'Shared message board for live mission control. All authorized users can read and post messages.';
COMMENT ON COLUMN public.event_message_board.author_email IS 
  'Denormalized email for display (from auth.users)';
COMMENT ON COLUMN public.event_message_board.author_name IS 
  'Denormalized name for display';
COMMENT ON COLUMN public.event_message_board.deleted_at IS 
  'Soft delete timestamp. Messages are hidden when deleted_at is set.';

