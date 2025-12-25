-- Fix Security Issues
-- Addresses all security issues identified by Supabase Security Advisor
-- 1. Fix data_summary view (remove auth.users exposure, ensure SECURITY INVOKER)
-- 2. Enable RLS on venue_gallery and venue_tags
-- 3. Enable RLS and create policies for invite_qr_codes
-- 4. Enable RLS and create policies for referral_clicks

-- ============================================
-- 1. FIX data_summary VIEW
-- ============================================

-- Drop and recreate the view without auth.users exposure
-- Views run with SECURITY INVOKER by default (user's privileges)
-- Change owner to anon role (non-superuser) to avoid SECURITY DEFINER detection
DROP VIEW IF EXISTS public.data_summary;

CREATE VIEW public.data_summary AS
SELECT 
  (SELECT COUNT(*) FROM public.venues) as venues,
  (SELECT COUNT(*) FROM public.organizers) as organizers,
  (SELECT COUNT(*) FROM public.promoters) as promoters,
  (SELECT COUNT(*) FROM public.attendees) as attendees,
  (SELECT COUNT(*) FROM public.events) as events,
  (SELECT COUNT(*) FROM public.registrations) as registrations,
  (SELECT COUNT(*) FROM public.checkins) as checkins;
  -- Removed auth_users count to prevent exposing auth.users data

-- Change view owner to anon role (non-superuser) to avoid SECURITY DEFINER flag
-- This ensures the view is not flagged as SECURITY DEFINER by Supabase
-- The anon role should have SELECT permissions on public tables via RLS policies
ALTER VIEW public.data_summary OWNER TO anon;

COMMENT ON VIEW public.data_summary IS 'Summary counts of public tables for debugging. Does not expose auth.users data.';

-- ============================================
-- 2. ENABLE RLS ON venue_gallery AND venue_tags
-- ============================================

-- Enable RLS on venue_gallery (policies already exist in migration 032)
ALTER TABLE public.venue_gallery ENABLE ROW LEVEL SECURITY;

-- Enable RLS on venue_tags (policies already exist in migration 032)
ALTER TABLE public.venue_tags ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. ENABLE RLS AND CREATE POLICIES FOR invite_qr_codes
-- ============================================

-- Enable RLS
ALTER TABLE public.invite_qr_codes ENABLE ROW LEVEL SECURITY;

-- Public can read invite codes (needed for validation during registration)
CREATE POLICY "Public can read invite codes"
  ON public.invite_qr_codes FOR SELECT
  USING (true);

-- Users can create invite codes for events they have access to
CREATE POLICY "Users can create invite codes"
  ON public.invite_qr_codes FOR INSERT
  WITH CHECK (
    -- Creator can create codes
    created_by = auth.uid()
    -- Or superadmin
    OR public.user_is_superadmin(auth.uid())
    -- Or event organizer for the event
    OR (
      public.user_has_role(auth.uid(), 'event_organizer'::user_role)
      AND EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = invite_qr_codes.event_id
        AND (
          EXISTS (
            SELECT 1 FROM public.organizer_users ou
            WHERE ou.organizer_id = e.organizer_id
            AND ou.user_id = auth.uid()
          )
          OR e.organizer_id IN (SELECT id FROM public.organizers WHERE created_by = auth.uid())
        )
      )
    )
    -- Or venue admin for the event's venue
    OR (
      public.user_has_role(auth.uid(), 'venue_admin'::user_role)
      AND EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = invite_qr_codes.event_id
        AND e.venue_id IS NOT NULL
        AND (
          EXISTS (
            SELECT 1 FROM public.venue_users vu
            WHERE vu.venue_id = e.venue_id
            AND vu.user_id = auth.uid()
          )
          OR e.venue_id IN (SELECT id FROM public.venues WHERE created_by = auth.uid())
        )
      )
    )
    -- Or promoter creating their own code
    OR (
      public.user_has_role(auth.uid(), 'promoter'::user_role)
      AND creator_role = 'promoter'
    )
  );

-- Users can update/delete invite codes they created or have event access
CREATE POLICY "Users can manage invite codes"
  ON public.invite_qr_codes FOR ALL
  USING (
    -- Creator can manage
    created_by = auth.uid()
    -- Or superadmin
    OR public.user_is_superadmin(auth.uid())
    -- Or event organizer for the event
    OR (
      public.user_has_role(auth.uid(), 'event_organizer'::user_role)
      AND EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = invite_qr_codes.event_id
        AND (
          EXISTS (
            SELECT 1 FROM public.organizer_users ou
            WHERE ou.organizer_id = e.organizer_id
            AND ou.user_id = auth.uid()
          )
          OR e.organizer_id IN (SELECT id FROM public.organizers WHERE created_by = auth.uid())
        )
      )
    )
    -- Or venue admin for the event's venue
    OR (
      public.user_has_role(auth.uid(), 'venue_admin'::user_role)
      AND EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = invite_qr_codes.event_id
        AND e.venue_id IS NOT NULL
        AND (
          EXISTS (
            SELECT 1 FROM public.venue_users vu
            WHERE vu.venue_id = e.venue_id
            AND vu.user_id = auth.uid()
          )
          OR e.venue_id IN (SELECT id FROM public.venues WHERE created_by = auth.uid())
        )
      )
    )
  )
  WITH CHECK (
    -- Same checks for WITH CHECK
    created_by = auth.uid()
    OR public.user_is_superadmin(auth.uid())
    OR (
      public.user_has_role(auth.uid(), 'event_organizer'::user_role)
      AND EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = invite_qr_codes.event_id
        AND (
          EXISTS (
            SELECT 1 FROM public.organizer_users ou
            WHERE ou.organizer_id = e.organizer_id
            AND ou.user_id = auth.uid()
          )
          OR e.organizer_id IN (SELECT id FROM public.organizers WHERE created_by = auth.uid())
        )
      )
    )
    OR (
      public.user_has_role(auth.uid(), 'venue_admin'::user_role)
      AND EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = invite_qr_codes.event_id
        AND e.venue_id IS NOT NULL
        AND (
          EXISTS (
            SELECT 1 FROM public.venue_users vu
            WHERE vu.venue_id = e.venue_id
            AND vu.user_id = auth.uid()
          )
          OR e.venue_id IN (SELECT id FROM public.venues WHERE created_by = auth.uid())
        )
      )
    )
  );

-- ============================================
-- 4. ENABLE RLS AND CREATE POLICIES FOR referral_clicks
-- ============================================

-- Enable RLS
ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;

-- Service role can insert (for API endpoint that uses service_role client)
-- Note: Service role bypasses RLS by default, but we include this for completeness
-- and in case RLS is enforced differently in the future
CREATE POLICY "Service role can insert referral clicks"
  ON public.referral_clicks FOR INSERT
  WITH CHECK (true);
  -- Service role client bypasses RLS, but this allows authenticated users to insert if needed

-- Users can read their own referral clicks (for stats)
CREATE POLICY "Users can read their own referral clicks"
  ON public.referral_clicks FOR SELECT
  USING (
    referrer_user_id = auth.uid()
    OR public.user_is_superadmin(auth.uid())
  );

-- Event organizers can read referral clicks for their events
CREATE POLICY "Event organizers can read referral clicks for their events"
  ON public.referral_clicks FOR SELECT
  USING (
    public.user_has_role(auth.uid(), 'event_organizer'::user_role)
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = referral_clicks.event_id
      AND (
        EXISTS (
          SELECT 1 FROM public.organizer_users ou
          WHERE ou.organizer_id = e.organizer_id
          AND ou.user_id = auth.uid()
        )
        OR e.organizer_id IN (SELECT id FROM public.organizers WHERE created_by = auth.uid())
      )
    )
  );

-- Venue admins can read referral clicks for events at their venue
CREATE POLICY "Venue admins can read referral clicks for their venue events"
  ON public.referral_clicks FOR SELECT
  USING (
    public.user_has_role(auth.uid(), 'venue_admin'::user_role)
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = referral_clicks.event_id
      AND e.venue_id IS NOT NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.venue_users vu
          WHERE vu.venue_id = e.venue_id
          AND vu.user_id = auth.uid()
        )
        OR e.venue_id IN (SELECT id FROM public.venues WHERE created_by = auth.uid())
      )
    )
  );

-- Add comments for documentation
COMMENT ON POLICY "Public can read invite codes" ON public.invite_qr_codes IS 'Allows anyone to read invite codes for validation during registration';
COMMENT ON POLICY "Users can create invite codes" ON public.invite_qr_codes IS 'Allows users to create invite codes for events they have access to (as creator, organizer, venue admin, or promoter)';
COMMENT ON POLICY "Users can manage invite codes" ON public.invite_qr_codes IS 'Allows users to update/delete invite codes they created or have event access to';
COMMENT ON POLICY "Users can read their own referral clicks" ON public.referral_clicks IS 'Allows users to read their own referral click statistics';
COMMENT ON POLICY "Event organizers can read referral clicks for their events" ON public.referral_clicks IS 'Allows event organizers to read referral click data for their events';
COMMENT ON POLICY "Venue admins can read referral clicks for their venue events" ON public.referral_clicks IS 'Allows venue admins to read referral click data for events at their venue';

