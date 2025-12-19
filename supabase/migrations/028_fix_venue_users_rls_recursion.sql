-- ============================================
-- FIX: venue_users RLS infinite recursion
-- ============================================
-- The existing policies on venue_users query venue_users itself,
-- causing infinite recursion. We need to fix this.

-- Drop the problematic policies
DROP POLICY IF EXISTS "Venue admins can read their venue assignments" ON public.venue_users;
DROP POLICY IF EXISTS "Venue admins can read all assignments for their venues" ON public.venue_users;

-- Create a security definer function to check venue membership
-- This bypasses RLS to avoid recursion
CREATE OR REPLACE FUNCTION public.user_is_venue_member(p_user_id uuid, p_venue_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.venue_users
    WHERE user_id = p_user_id
    AND venue_id = p_venue_id
  );
$$;

-- Recreate the policy using the security definer function
CREATE POLICY "Venue members can read assignments for their venues"
  ON public.venue_users FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.user_is_superadmin(auth.uid())
    OR public.user_is_venue_member(auth.uid(), venue_id)
  );

-- Also fix similar issues in attendees and registrations policies
-- that might be referencing venue_users indirectly

-- Drop and recreate attendees policies to avoid venue_users recursion
DROP POLICY IF EXISTS "venue_attendee_access" ON public.attendees;
DROP POLICY IF EXISTS "organizer_attendee_access" ON public.attendees;

-- Simpler attendee policies that don't cause recursion
-- Users can read their own attendee record
CREATE POLICY "users_read_own_attendee"
  ON public.attendees FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own attendee record  
CREATE POLICY "users_update_own_attendee"
  ON public.attendees FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Superadmins can do everything with attendees
CREATE POLICY "superadmin_attendees_all"
  ON public.attendees FOR ALL
  USING (public.user_is_superadmin(auth.uid()));

-- Fix registrations policies
DROP POLICY IF EXISTS "Users can read their own registrations" ON public.registrations;

-- Users can read registrations for their own attendee record
CREATE POLICY "users_read_own_registrations"
  ON public.registrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.attendees a
      WHERE a.id = attendee_id
      AND a.user_id = auth.uid()
    )
    OR public.user_is_superadmin(auth.uid())
  );

COMMENT ON FUNCTION public.user_is_venue_member IS 'Security definer function to check venue membership without triggering RLS recursion';

