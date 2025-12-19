-- User Avatars
-- Add avatar_url support for user profiles
-- Avatars can be stored in Supabase Storage or external URLs

-- Add avatar_url to event_message_board for denormalized storage
ALTER TABLE public.event_message_board 
ADD COLUMN IF NOT EXISTS author_avatar_url TEXT;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_event_message_board_author_avatar ON public.event_message_board(author_avatar_url) WHERE author_avatar_url IS NOT NULL;

-- Comments
COMMENT ON COLUMN public.event_message_board.author_avatar_url IS 
  'Avatar URL for the message author. Can be Supabase Storage path or external URL. Falls back to initials if not set.';

