-- RLS Policies for Unified XP System
-- Sets up row-level security for XP ledger, badges, and user badges

-- ============================================
-- XP LEDGER POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Attendees can read their own XP" ON public.xp_ledger;
DROP POLICY IF EXISTS "Event access users can read XP for events" ON public.xp_ledger;

-- Users can read their own XP (all role contexts)
CREATE POLICY "Users can read own XP"
  ON public.xp_ledger FOR SELECT
  USING (user_id = auth.uid());

-- Event access users can read XP for their events (filtered)
CREATE POLICY "Event access users can read XP for events"
  ON public.xp_ledger FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = xp_ledger.event_id
      AND (
        -- Organizer
        (public.user_has_role(auth.uid(), 'event_organizer'::user_role)
         AND e.organizer_id = public.get_user_organizer_id(auth.uid()))
        -- Venue admin
        OR (public.user_has_role(auth.uid(), 'venue_admin'::user_role)
            AND e.venue_id = public.get_user_venue_id(auth.uid()))
        -- Promoter
        OR (public.user_has_role(auth.uid(), 'promoter'::user_role)
            AND EXISTS (
              SELECT 1 FROM public.event_promoters ep
              WHERE ep.event_id = e.id
              AND ep.promoter_id = public.get_user_promoter_id(auth.uid())
            ))
      )
    )
  );

-- Only system/service role can insert XP (via functions)
-- This is enforced by SECURITY DEFINER on award_xp() function
-- Regular users cannot directly insert into xp_ledger
CREATE POLICY "Only system can insert XP"
  ON public.xp_ledger FOR INSERT
  WITH CHECK (false); -- XP only via award_xp() function called by triggers

-- ============================================
-- BADGES POLICIES
-- ============================================

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Badges: Public read (everyone can see badge definitions)
CREATE POLICY "Public can read badges"
  ON public.badges FOR SELECT
  USING (true);

-- Users can read their own badges
CREATE POLICY "Users can read own badges"
  ON public.user_badges FOR SELECT
  USING (user_id = auth.uid());

-- Event access users can read badges for users in their events (for leaderboards)
-- This is handled via the XP policies above - badges are metadata

-- Organizers/venues can award badges
CREATE POLICY "Organizers can award badges"
  ON public.user_badges FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.badges b
      WHERE b.id = user_badges.badge_id
      AND b.is_giftable = true
    )
    AND (
      public.user_has_role(auth.uid(), 'event_organizer'::user_role)
      OR public.user_has_role(auth.uid(), 'venue_admin'::user_role)
      OR public.user_has_role(auth.uid(), 'superadmin'::user_role)
    )
  );

-- ============================================
-- XP LEVELS POLICIES
-- ============================================

ALTER TABLE xp_levels ENABLE ROW LEVEL SECURITY;

-- XP levels: Public read (everyone can see level definitions)
CREATE POLICY "Public can read XP levels"
  ON public.xp_levels FOR SELECT
  USING (true);

-- ============================================
-- USER XP SUMMARY POLICIES
-- ============================================

-- Materialized views don't support RLS directly
-- Access is controlled through the underlying xp_ledger table
-- Users should refresh this view periodically or use it as read-only cache

