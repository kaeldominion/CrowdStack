-- Promoter Request System
-- Allows promoters to request to promote events, requiring organizer/venue approval

-- Create promoter_requests table
CREATE TABLE IF NOT EXISTS public.promoter_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  promoter_id UUID NOT NULL REFERENCES public.promoters(id) ON DELETE CASCADE,
  message TEXT, -- Optional intro message from promoter
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'withdrawn')),
  
  -- Response tracking
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES auth.users(id),
  response_message TEXT, -- Optional message from organizer/venue
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Each promoter can only have one active request per event
  UNIQUE(event_id, promoter_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_promoter_requests_event ON public.promoter_requests(event_id);
CREATE INDEX IF NOT EXISTS idx_promoter_requests_promoter ON public.promoter_requests(promoter_id);
CREATE INDEX IF NOT EXISTS idx_promoter_requests_status ON public.promoter_requests(status);
CREATE INDEX IF NOT EXISTS idx_promoter_requests_created ON public.promoter_requests(created_at DESC);

-- Enable RLS
ALTER TABLE public.promoter_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Superadmins can do everything
DROP POLICY IF EXISTS "Superadmins can manage all promoter requests" ON public.promoter_requests;
CREATE POLICY "Superadmins can manage all promoter requests"
  ON public.promoter_requests
  FOR ALL
  USING (public.user_has_role(auth.uid(), 'superadmin'::user_role))
  WITH CHECK (public.user_has_role(auth.uid(), 'superadmin'::user_role));

-- Promoters can view their own requests
DROP POLICY IF EXISTS "Promoters can view their own requests" ON public.promoter_requests;
CREATE POLICY "Promoters can view their own requests"
  ON public.promoter_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.promoters p
      WHERE p.id = promoter_requests.promoter_id
      AND p.user_id = auth.uid()
    )
  );

-- Promoters can create requests for themselves
DROP POLICY IF EXISTS "Promoters can create their own requests" ON public.promoter_requests;
CREATE POLICY "Promoters can create their own requests"
  ON public.promoter_requests
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.promoters p
      WHERE p.id = promoter_requests.promoter_id
      AND p.user_id = auth.uid()
    )
  );

-- Promoters can withdraw their own pending requests
DROP POLICY IF EXISTS "Promoters can withdraw their pending requests" ON public.promoter_requests;
CREATE POLICY "Promoters can withdraw their pending requests"
  ON public.promoter_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.promoters p
      WHERE p.id = promoter_requests.promoter_id
      AND p.user_id = auth.uid()
    )
    AND status = 'pending'
  )
  WITH CHECK (
    status = 'withdrawn'
  );

-- Event organizers can view and respond to requests for their events
DROP POLICY IF EXISTS "Organizers can view requests for their events" ON public.promoter_requests;
CREATE POLICY "Organizers can view requests for their events"
  ON public.promoter_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organizers o ON e.organizer_id = o.id
      LEFT JOIN public.organizer_users ou ON o.id = ou.organizer_id
      WHERE e.id = promoter_requests.event_id
      AND (o.created_by = auth.uid() OR ou.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Organizers can respond to requests for their events" ON public.promoter_requests;
CREATE POLICY "Organizers can respond to requests for their events"
  ON public.promoter_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organizers o ON e.organizer_id = o.id
      LEFT JOIN public.organizer_users ou ON o.id = ou.organizer_id
      WHERE e.id = promoter_requests.event_id
      AND (o.created_by = auth.uid() OR ou.user_id = auth.uid())
    )
  );

-- Venue admins can view and respond to requests for events at their venue
DROP POLICY IF EXISTS "Venue admins can view requests for their venue events" ON public.promoter_requests;
CREATE POLICY "Venue admins can view requests for their venue events"
  ON public.promoter_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.venues v ON e.venue_id = v.id
      LEFT JOIN public.venue_users vu ON v.id = vu.venue_id
      WHERE e.id = promoter_requests.event_id
      AND (v.created_by = auth.uid() OR vu.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Venue admins can respond to requests for their venue events" ON public.promoter_requests;
CREATE POLICY "Venue admins can respond to requests for their venue events"
  ON public.promoter_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.venues v ON e.venue_id = v.id
      LEFT JOIN public.venue_users vu ON v.id = vu.venue_id
      WHERE e.id = promoter_requests.event_id
      AND (v.created_by = auth.uid() OR vu.user_id = auth.uid())
    )
  );

-- Updated at trigger
DROP TRIGGER IF EXISTS set_promoter_requests_updated_at ON public.promoter_requests;
CREATE TRIGGER set_promoter_requests_updated_at
  BEFORE UPDATE ON public.promoter_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Comments
COMMENT ON TABLE public.promoter_requests IS 'Tracks promoter requests to promote events - requires organizer/venue approval';
COMMENT ON COLUMN public.promoter_requests.message IS 'Optional introduction message from the promoter';
COMMENT ON COLUMN public.promoter_requests.status IS 'Request status: pending, approved, declined, or withdrawn';
COMMENT ON COLUMN public.promoter_requests.response_message IS 'Optional response message from organizer/venue';


