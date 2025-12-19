-- Audience Messaging System
-- Enables scoped messaging to venues, organizers, promoters, or events
-- All messages are queued and logged - no direct contact export

-- Create audience_messages table
CREATE TABLE IF NOT EXISTS public.audience_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audience_type TEXT NOT NULL CHECK (audience_type IN ('venue', 'organizer', 'promoter', 'event')),
  audience_id UUID NOT NULL,  -- venue_id, organizer_id, promoter_id, or event_id
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_audience_messages_sender_id ON public.audience_messages(sender_id);
CREATE INDEX idx_audience_messages_audience ON public.audience_messages(audience_type, audience_id);
CREATE INDEX idx_audience_messages_status ON public.audience_messages(status);
CREATE INDEX idx_audience_messages_created_at ON public.audience_messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.audience_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only read messages they sent
CREATE POLICY "Users can read their own messages"
  ON public.audience_messages FOR SELECT
  USING (
    sender_id = auth.uid()
    OR public.user_is_superadmin(auth.uid())
  );

-- RLS Policy: Users can insert messages (will be validated server-side for audience access)
CREATE POLICY "Users can create messages"
  ON public.audience_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- RLS Policy: Users can update their own messages (for status updates during processing)
CREATE POLICY "Users can update their own messages"
  ON public.audience_messages FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_audience_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER audience_messages_updated_at
  BEFORE UPDATE ON public.audience_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_audience_messages_updated_at();

-- Comments
COMMENT ON TABLE public.audience_messages IS 
  'Queue for audience-scoped messages. Messages are queued server-side and validated before sending.';
COMMENT ON COLUMN public.audience_messages.audience_type IS 
  'Type of audience: venue, organizer, promoter, or event';
COMMENT ON COLUMN public.audience_messages.audience_id IS 
  'ID of the audience (venue_id, organizer_id, promoter_id, or event_id)';
COMMENT ON COLUMN public.audience_messages.recipient_count IS 
  'Number of recipients, calculated server-side before queuing';
COMMENT ON COLUMN public.audience_messages.status IS 
  'Message status: queued (default), processing, sent, or failed';

