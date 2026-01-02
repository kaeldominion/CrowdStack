-- DJ Gig Postings Table
-- Allows organizers to post gigs for DJs (invite-only or open postings)

CREATE TABLE IF NOT EXISTS public.dj_gig_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES public.organizers(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Gig details
  title TEXT NOT NULL,
  description TEXT,
  requirements TEXT,
  
  -- Payment (fixed price)
  payment_amount DECIMAL(10, 2),
  payment_currency TEXT DEFAULT 'USD',
  show_payment BOOLEAN DEFAULT true, -- Whether to show payment amount to DJs
  
  -- Posting type
  posting_type TEXT NOT NULL DEFAULT 'invite_only' CHECK (posting_type IN ('invite_only', 'open')),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed', 'filled')),
  
  -- Deadline
  deadline TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_payment CHECK (
    (payment_amount IS NULL AND show_payment = false) OR
    (payment_amount IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dj_gig_postings_event_id ON public.dj_gig_postings(event_id);
CREATE INDEX IF NOT EXISTS idx_dj_gig_postings_organizer_id ON public.dj_gig_postings(organizer_id);
CREATE INDEX IF NOT EXISTS idx_dj_gig_postings_status ON public.dj_gig_postings(status);
CREATE INDEX IF NOT EXISTS idx_dj_gig_postings_posting_type ON public.dj_gig_postings(posting_type);
CREATE INDEX IF NOT EXISTS idx_dj_gig_postings_created_at ON public.dj_gig_postings(created_at DESC);

-- Enable RLS
ALTER TABLE public.dj_gig_postings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Organizers can view their own gig postings
CREATE POLICY "Organizers can view own gig postings"
  ON public.dj_gig_postings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organizers o
      INNER JOIN public.organizer_users ou ON ou.organizer_id = o.id
      WHERE o.id = dj_gig_postings.organizer_id
      AND ou.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.organizers o
      WHERE o.id = dj_gig_postings.organizer_id
      AND o.created_by = auth.uid()
    )
  );

-- Organizers can create gig postings
CREATE POLICY "Organizers can create gig postings"
  ON public.dj_gig_postings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizers o
      INNER JOIN public.organizer_users ou ON ou.organizer_id = o.id
      WHERE o.id = dj_gig_postings.organizer_id
      AND ou.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.organizers o
      WHERE o.id = dj_gig_postings.organizer_id
      AND o.created_by = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Organizers can update their own gig postings
CREATE POLICY "Organizers can update own gig postings"
  ON public.dj_gig_postings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organizers o
      INNER JOIN public.organizer_users ou ON ou.organizer_id = o.id
      WHERE o.id = dj_gig_postings.organizer_id
      AND ou.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.organizers o
      WHERE o.id = dj_gig_postings.organizer_id
      AND o.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizers o
      INNER JOIN public.organizer_users ou ON ou.organizer_id = o.id
      WHERE o.id = dj_gig_postings.organizer_id
      AND ou.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.organizers o
      WHERE o.id = dj_gig_postings.organizer_id
      AND o.created_by = auth.uid()
    )
  );

-- DJs can view active/open gig postings
-- Note: Invitation check is added in migration 117 after dj_gig_invitations table is created
CREATE POLICY "DJs can view active open gig postings"
  ON public.dj_gig_postings
  FOR SELECT
  USING (
    status = 'active'
    AND posting_type = 'open'
  );

-- Superadmins can do everything
CREATE POLICY "Superadmins can manage all gig postings"
  ON public.dj_gig_postings
  FOR ALL
  USING (public.user_is_superadmin(auth.uid()))
  WITH CHECK (public.user_is_superadmin(auth.uid()));

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_dj_gig_postings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_dj_gig_postings_updated_at ON public.dj_gig_postings;
CREATE TRIGGER trigger_update_dj_gig_postings_updated_at
  BEFORE UPDATE ON public.dj_gig_postings
  FOR EACH ROW
  EXECUTE FUNCTION update_dj_gig_postings_updated_at();

COMMENT ON TABLE public.dj_gig_postings IS 'Gig postings for DJs - organizers can post gigs with fixed prices (invite-only or open)';

