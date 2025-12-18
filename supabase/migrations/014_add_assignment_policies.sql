-- Add RLS policies for superadmins to manage user assignments
-- This allows superadmins to assign users to venues/organizers via the admin UI

-- ============================================
-- VENUE_USERS POLICIES
-- ============================================

-- Superadmins can manage all venue assignments
CREATE POLICY "Superadmins can manage venue assignments"
  ON public.venue_users FOR ALL
  USING (public.user_is_superadmin(auth.uid()))
  WITH CHECK (public.user_is_superadmin(auth.uid()));

-- Venue admins can read assignments for their venues
CREATE POLICY "Venue admins can read their venue assignments"
  ON public.venue_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.venue_users vu
      WHERE vu.venue_id = venue_users.venue_id
      AND vu.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = venue_users.venue_id
      AND v.created_by = auth.uid()
    )
    OR public.user_is_superadmin(auth.uid())
  );

-- Users can read their own assignments
CREATE POLICY "Users can read their own venue assignments"
  ON public.venue_users FOR SELECT
  USING (user_id = auth.uid() OR public.user_is_superadmin(auth.uid()));

-- ============================================
-- ORGANIZER_USERS POLICIES
-- ============================================

-- Superadmins can manage all organizer assignments
CREATE POLICY "Superadmins can manage organizer assignments"
  ON public.organizer_users FOR ALL
  USING (public.user_is_superadmin(auth.uid()))
  WITH CHECK (public.user_is_superadmin(auth.uid()));

-- Organizers can read assignments for their organizers
CREATE POLICY "Organizers can read their organizer assignments"
  ON public.organizer_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organizer_users ou
      WHERE ou.organizer_id = organizer_users.organizer_id
      AND ou.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.organizers o
      WHERE o.id = organizer_users.organizer_id
      AND o.created_by = auth.uid()
    )
    OR public.user_is_superadmin(auth.uid())
  );

-- Users can read their own assignments
CREATE POLICY "Users can read their own organizer assignments"
  ON public.organizer_users FOR SELECT
  USING (user_id = auth.uid() OR public.user_is_superadmin(auth.uid()));

COMMENT ON POLICY "Superadmins can manage venue assignments" ON public.venue_users IS 'Allows superadmins to assign/unassign users to venues via admin UI';
COMMENT ON POLICY "Superadmins can manage organizer assignments" ON public.organizer_users IS 'Allows superadmins to assign/unassign users to organizers via admin UI';

