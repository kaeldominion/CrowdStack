-- DJ Gig Responses Table
-- Stores DJ responses to gig postings (interested, declined, or confirmed)

CREATE TABLE IF NOT EXISTS public.dj_gig_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_posting_id UUID NOT NULL REFERENCES public.dj_gig_postings(id) ON DELETE CASCADE,
  dj_id UUID NOT NULL REFERENCES public.djs(id) ON DELETE CASCADE,
  
  -- Response details
  status TEXT NOT NULL DEFAULT 'interested' CHECK (status IN ('interested', 'declined', 'confirmed')),
  message TEXT, -- Optional message from DJ
  
  -- Timestamps
  responded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE, -- When organizer selects this DJ
  
  -- Unique constraint: one response per DJ per gig
  UNIQUE(gig_posting_id, dj_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dj_gig_responses_gig_posting_id ON public.dj_gig_responses(gig_posting_id);
CREATE INDEX IF NOT EXISTS idx_dj_gig_responses_dj_id ON public.dj_gig_responses(dj_id);
CREATE INDEX IF NOT EXISTS idx_dj_gig_responses_status ON public.dj_gig_responses(status);
CREATE INDEX IF NOT EXISTS idx_dj_gig_responses_responded_at ON public.dj_gig_responses(responded_at DESC);

-- Enable RLS
ALTER TABLE public.dj_gig_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Organizers can view responses to their gig postings
CREATE POLICY "Organizers can view responses to their gigs"
  ON public.dj_gig_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dj_gig_postings g
      INNER JOIN public.organizers o ON o.id = g.organizer_id
      INNER JOIN public.organizer_users ou ON ou.organizer_id = o.id
      WHERE g.id = dj_gig_responses.gig_posting_id
      AND ou.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.dj_gig_postings g
      INNER JOIN public.organizers o ON o.id = g.organizer_id
      WHERE g.id = dj_gig_responses.gig_posting_id
      AND o.created_by = auth.uid()
    )
  );

-- DJs can view their own responses
CREATE POLICY "DJs can view own responses"
  ON public.dj_gig_responses
  FOR SELECT
  USING (
    dj_id IN (
      SELECT id FROM public.djs WHERE user_id = auth.uid()
    )
  );

-- DJs can create/update their own responses
CREATE POLICY "DJs can manage own responses"
  ON public.dj_gig_responses
  FOR ALL
  USING (
    dj_id IN (
      SELECT id FROM public.djs WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    dj_id IN (
      SELECT id FROM public.djs WHERE user_id = auth.uid()
    )
  );

-- Organizers can update response status to 'confirmed' when selecting DJ
-- Note: Status transition validation is handled by trigger below
CREATE POLICY "Organizers can confirm responses"
  ON public.dj_gig_responses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.dj_gig_postings g
      INNER JOIN public.organizers o ON o.id = g.organizer_id
      INNER JOIN public.organizer_users ou ON ou.organizer_id = o.id
      WHERE g.id = dj_gig_responses.gig_posting_id
      AND ou.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.dj_gig_postings g
      INNER JOIN public.organizers o ON o.id = g.organizer_id
      WHERE g.id = dj_gig_responses.gig_posting_id
      AND o.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dj_gig_postings g
      INNER JOIN public.organizers o ON o.id = g.organizer_id
      INNER JOIN public.organizer_users ou ON ou.organizer_id = o.id
      WHERE g.id = dj_gig_responses.gig_posting_id
      AND ou.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.dj_gig_postings g
      INNER JOIN public.organizers o ON o.id = g.organizer_id
      WHERE g.id = dj_gig_responses.gig_posting_id
      AND o.created_by = auth.uid()
    )
    -- Validate that if status is 'confirmed', confirmed_at must be set
    AND (
      status != 'confirmed' OR confirmed_at IS NOT NULL
    )
  );

-- Superadmins can do everything
CREATE POLICY "Superadmins can manage all responses"
  ON public.dj_gig_responses
  FOR ALL
  USING (public.user_is_superadmin(auth.uid()))
  WITH CHECK (public.user_is_superadmin(auth.uid()));

-- Update trigger for updated_at and status validation
CREATE OR REPLACE FUNCTION update_dj_gig_responses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  
  -- Validate status transitions
  -- Only allow changing from 'interested' to 'confirmed'
  IF OLD.status = 'interested' AND NEW.status = 'confirmed' THEN
    -- Ensure confirmed_at is set when confirming
    IF NEW.confirmed_at IS NULL THEN
      NEW.confirmed_at = NOW();
    END IF;
  ELSIF OLD.status != NEW.status AND NEW.status = 'confirmed' THEN
    -- Don't allow changing from 'declined' to 'confirmed' directly
    RAISE EXCEPTION 'Cannot change status from % to confirmed. Only interested responses can be confirmed.', OLD.status;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_dj_gig_responses_updated_at ON public.dj_gig_responses;
CREATE TRIGGER trigger_update_dj_gig_responses_updated_at
  BEFORE UPDATE ON public.dj_gig_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_dj_gig_responses_updated_at();

COMMENT ON TABLE public.dj_gig_responses IS 'DJ responses to gig postings (interested, declined, or confirmed)';

