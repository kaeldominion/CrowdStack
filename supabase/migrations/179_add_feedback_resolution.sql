-- Add resolution and internal notes to event_feedback
-- Allows venues to mark feedback as resolved and add internal notes

ALTER TABLE public.event_feedback
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS internal_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_feedback_resolved_at 
  ON public.event_feedback(resolved_at) 
  WHERE resolved_at IS NOT NULL;

COMMENT ON COLUMN public.event_feedback.resolved_at IS 'When venue marked this feedback as resolved';
COMMENT ON COLUMN public.event_feedback.resolved_by IS 'User who marked this feedback as resolved';
COMMENT ON COLUMN public.event_feedback.internal_notes IS 'Internal notes added by venue (not visible to attendees)';
