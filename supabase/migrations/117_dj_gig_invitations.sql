-- DJ Gig Invitations Table
-- Links specific DJs to gig postings (for invite-only postings)

CREATE TABLE IF NOT EXISTS public.dj_gig_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_posting_id UUID NOT NULL REFERENCES public.dj_gig_postings(id) ON DELETE CASCADE,
  dj_id UUID NOT NULL REFERENCES public.djs(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Tracking
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  viewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Unique constraint: one invitation per DJ per gig
  UNIQUE(gig_posting_id, dj_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dj_gig_invitations_gig_posting_id ON public.dj_gig_invitations(gig_posting_id);
CREATE INDEX IF NOT EXISTS idx_dj_gig_invitations_dj_id ON public.dj_gig_invitations(dj_id);
CREATE INDEX IF NOT EXISTS idx_dj_gig_invitations_invited_at ON public.dj_gig_invitations(invited_at DESC);

-- Enable RLS
ALTER TABLE public.dj_gig_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Organizers can view invitations for their gig postings
CREATE POLICY "Organizers can view invitations for their gigs"
  ON public.dj_gig_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dj_gig_postings g
      INNER JOIN public.organizers o ON o.id = g.organizer_id
      INNER JOIN public.organizer_users ou ON ou.organizer_id = o.id
      WHERE g.id = dj_gig_invitations.gig_posting_id
      AND ou.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.dj_gig_postings g
      INNER JOIN public.organizers o ON o.id = g.organizer_id
      WHERE g.id = dj_gig_invitations.gig_posting_id
      AND o.created_by = auth.uid()
    )
  );

-- Organizers can create invitations for their gig postings
CREATE POLICY "Organizers can create invitations"
  ON public.dj_gig_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dj_gig_postings g
      INNER JOIN public.organizers o ON o.id = g.organizer_id
      INNER JOIN public.organizer_users ou ON ou.organizer_id = o.id
      WHERE g.id = dj_gig_invitations.gig_posting_id
      AND ou.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.dj_gig_postings g
      INNER JOIN public.organizers o ON o.id = g.organizer_id
      WHERE g.id = dj_gig_invitations.gig_posting_id
      AND o.created_by = auth.uid()
    )
    AND invited_by = auth.uid()
  );

-- DJs can view their own invitations
CREATE POLICY "DJs can view own invitations"
  ON public.dj_gig_invitations
  FOR SELECT
  USING (
    dj_id IN (
      SELECT id FROM public.djs WHERE user_id = auth.uid()
    )
  );

-- DJs can update viewed_at for their invitations
CREATE POLICY "DJs can update own invitation viewed_at"
  ON public.dj_gig_invitations
  FOR UPDATE
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

-- Superadmins can do everything
CREATE POLICY "Superadmins can manage all invitations"
  ON public.dj_gig_invitations
  FOR ALL
  USING (public.user_is_superadmin(auth.uid()))
  WITH CHECK (public.user_is_superadmin(auth.uid()));

-- Now that dj_gig_invitations table exists, update the DJ policy on dj_gig_postings
-- to include invitations
DROP POLICY IF EXISTS "DJs can view active open gig postings" ON public.dj_gig_postings;
CREATE POLICY "DJs can view active gig postings"
  ON public.dj_gig_postings
  FOR SELECT
  USING (
    status = 'active'
    AND (
      posting_type = 'open'
      OR EXISTS (
        SELECT 1 FROM public.dj_gig_invitations
        WHERE dj_gig_invitations.gig_posting_id = dj_gig_postings.id
        AND dj_gig_invitations.dj_id IN (
          SELECT id FROM public.djs WHERE user_id = auth.uid()
        )
      )
    )
  );

COMMENT ON TABLE public.dj_gig_invitations IS 'Invitations linking specific DJs to gig postings (for invite-only postings)';

