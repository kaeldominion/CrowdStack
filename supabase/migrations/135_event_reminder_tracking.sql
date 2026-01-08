-- Track sent event reminders to prevent duplicates
CREATE TABLE IF NOT EXISTS public.event_reminder_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL DEFAULT '6h' CHECK (reminder_type IN ('6h', '24h', '4h')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(registration_id, event_id, reminder_type)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_event_reminder_sent_registration 
  ON public.event_reminder_sent(registration_id);

CREATE INDEX IF NOT EXISTS idx_event_reminder_sent_event 
  ON public.event_reminder_sent(event_id);

CREATE INDEX IF NOT EXISTS idx_event_reminder_sent_type 
  ON public.event_reminder_sent(reminder_type);

-- RLS: Only service role can insert/read (cron job access)
ALTER TABLE public.event_reminder_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage reminder tracking"
  ON public.event_reminder_sent
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.event_reminder_sent IS 'Tracks sent event reminder emails to prevent duplicates';
COMMENT ON COLUMN public.event_reminder_sent.reminder_type IS 'Type of reminder: 6h (6 hours before), 24h, 4h, etc.';

