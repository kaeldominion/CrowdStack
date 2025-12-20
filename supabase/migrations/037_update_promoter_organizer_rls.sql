-- Update RLS policies to restrict promoter and organizer visibility
-- This migration updates policies to only show promoters/organizers based on work history
-- Must run after 036_promoter_work_history_tracking.sql which creates the helper functions

-- ============================================
-- UPDATE PROMOTERS POLICIES
-- ============================================

-- Drop the old policy that allowed all promoters
DROP POLICY IF EXISTS "Venue admins and organizers can read promoters" ON public.promoters;

-- Venue admins can only read promoters who have worked at their venue
CREATE POLICY "Venue admins can read promoters who worked at their venue"
  ON public.promoters FOR SELECT
  USING (
    public.user_has_role(auth.uid(), 'venue_admin'::user_role)
    AND EXISTS (
      SELECT 1 FROM public.get_promoters_for_venue(public.get_user_venue_id(auth.uid()))
      WHERE promoter_id = promoters.id
    )
  );

-- Event organizers can only read promoters who have worked on their events
CREATE POLICY "Event organizers can read promoters who worked on their events"
  ON public.promoters FOR SELECT
  USING (
    public.user_has_role(auth.uid(), 'event_organizer'::user_role)
    AND EXISTS (
      SELECT 1 FROM public.get_promoters_for_organizer(public.get_user_organizer_id(auth.uid()))
      WHERE promoter_id = promoters.id
    )
  );

-- ============================================
-- UPDATE ORGANIZERS POLICIES
-- ============================================

-- Organizers can read other organizers they have worked with (same venue)
CREATE POLICY "Organizers can read organizers they worked with"
  ON public.organizers FOR SELECT
  USING (
    public.user_has_role(auth.uid(), 'event_organizer'::user_role)
    AND EXISTS (
      SELECT 1 FROM public.get_organizers_worked_with(public.get_user_organizer_id(auth.uid()))
      WHERE organizer_id = organizers.id
    )
  );

