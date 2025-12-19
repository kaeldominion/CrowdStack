-- ============================================
-- FIX: All RLS infinite recursion issues
-- ============================================
-- Multiple tables have policies that reference each other causing recursion.
-- This migration fixes them all by using simpler policies and security definer functions.

-- ============================================
-- HELPER FUNCTIONS (Security Definer to bypass RLS)
-- ============================================

-- Check if user is assigned to an organizer (bypasses RLS)
CREATE OR REPLACE FUNCTION public.user_is_organizer_member(p_user_id uuid, p_organizer_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizer_users
    WHERE user_id = p_user_id
    AND organizer_id = p_organizer_id
  );
$$;

-- Get user's organizer IDs (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_organizer_ids(p_user_id uuid)
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(array_agg(organizer_id), '{}')
  FROM public.organizer_users
  WHERE user_id = p_user_id;
$$;

-- Get user's venue IDs (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_venue_ids(p_user_id uuid)
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(array_agg(venue_id), '{}')
  FROM public.venue_users
  WHERE user_id = p_user_id;
$$;

-- ============================================
-- FIX EVENTS POLICIES
-- ============================================

-- Drop all existing events SELECT policies to avoid conflicts
DROP POLICY IF EXISTS "Published events are publicly readable" ON public.events;
DROP POLICY IF EXISTS "Organizers can read their events" ON public.events;
DROP POLICY IF EXISTS "Venue admins can read events at their venue" ON public.events;
DROP POLICY IF EXISTS "Promoters can read assigned events" ON public.events;
DROP POLICY IF EXISTS "Door staff can read events" ON public.events;
DROP POLICY IF EXISTS "Superadmins can read all events" ON public.events;

-- Simple, non-recursive events policies
CREATE POLICY "events_public_read"
  ON public.events FOR SELECT
  USING (status = 'published');

CREATE POLICY "events_superadmin_all"
  ON public.events FOR ALL
  USING (public.user_is_superadmin(auth.uid()));

CREATE POLICY "events_organizer_read"
  ON public.events FOR SELECT
  USING (
    organizer_id = ANY(public.get_user_organizer_ids(auth.uid()))
  );

CREATE POLICY "events_venue_read"
  ON public.events FOR SELECT
  USING (
    venue_id = ANY(public.get_user_venue_ids(auth.uid()))
  );

-- ============================================
-- FIX ATTENDEES POLICIES  
-- ============================================

-- Drop existing attendee policies
DROP POLICY IF EXISTS "superadmin_full_access" ON public.attendees;
DROP POLICY IF EXISTS "users_read_own_attendee" ON public.attendees;
DROP POLICY IF EXISTS "users_update_own_attendee" ON public.attendees;
DROP POLICY IF EXISTS "superadmin_attendees_all" ON public.attendees;

-- Simple attendee policies
CREATE POLICY "attendees_own_read"
  ON public.attendees FOR SELECT
  USING (user_id = auth.uid() OR public.user_is_superadmin(auth.uid()));

CREATE POLICY "attendees_own_update"
  ON public.attendees FOR UPDATE
  USING (user_id = auth.uid() OR public.user_is_superadmin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.user_is_superadmin(auth.uid()));

CREATE POLICY "attendees_superadmin_insert"
  ON public.attendees FOR INSERT
  WITH CHECK (public.user_is_superadmin(auth.uid()));

CREATE POLICY "attendees_superadmin_delete"
  ON public.attendees FOR DELETE
  USING (public.user_is_superadmin(auth.uid()));

-- ============================================
-- FIX REGISTRATIONS POLICIES
-- ============================================

-- Drop existing registration policies
DROP POLICY IF EXISTS "users_read_own_registrations" ON public.registrations;
DROP POLICY IF EXISTS "Superadmins can read all registrations" ON public.registrations;

-- Simple registration policies
CREATE POLICY "registrations_own_read"
  ON public.registrations FOR SELECT
  USING (
    attendee_id IN (
      SELECT id FROM public.attendees WHERE user_id = auth.uid()
    )
    OR public.user_is_superadmin(auth.uid())
  );

CREATE POLICY "registrations_superadmin_all"
  ON public.registrations FOR ALL
  USING (public.user_is_superadmin(auth.uid()));

-- ============================================
-- FIX ORGANIZER_USERS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Organizer members can read assignments for their organizers" ON public.organizer_users;
DROP POLICY IF EXISTS "Organizer admins can read their organizer assignments" ON public.organizer_users;

CREATE POLICY "organizer_users_own_read"
  ON public.organizer_users FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.user_is_superadmin(auth.uid())
  );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION public.user_is_organizer_member IS 'Security definer function to check organizer membership without triggering RLS recursion';
COMMENT ON FUNCTION public.get_user_organizer_ids IS 'Security definer function to get user organizer IDs without triggering RLS recursion';
COMMENT ON FUNCTION public.get_user_venue_ids IS 'Security definer function to get user venue IDs without triggering RLS recursion';

