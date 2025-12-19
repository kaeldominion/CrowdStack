-- ============================================
-- COMPLETE RLS CLEANUP
-- ============================================
-- Drop ALL existing policies and recreate simple, non-recursive ones.
-- This is a nuclear option to fix all the accumulated policy conflicts.

-- ============================================
-- DROP ALL POLICIES ON KEY TABLES
-- ============================================

-- ATTENDEES - drop everything
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'attendees' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.attendees', pol.policyname);
    END LOOP;
END $$;

-- REGISTRATIONS - drop everything
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'registrations' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.registrations', pol.policyname);
    END LOOP;
END $$;

-- EVENTS - drop everything  
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'events' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.events', pol.policyname);
    END LOOP;
END $$;

-- VENUE_USERS - drop everything
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'venue_users' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.venue_users', pol.policyname);
    END LOOP;
END $$;

-- ORGANIZER_USERS - drop everything
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'organizer_users' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.organizer_users', pol.policyname);
    END LOOP;
END $$;

-- CHECKINS - drop everything
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'checkins' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.checkins', pol.policyname);
    END LOOP;
END $$;

-- ============================================
-- CREATE SIMPLE, NON-RECURSIVE POLICIES
-- ============================================

-- EVENTS
-- Published events are public
CREATE POLICY "events_public_published"
  ON public.events FOR SELECT
  USING (status = 'published');

-- Superadmins can do everything
CREATE POLICY "events_superadmin"
  ON public.events FOR ALL
  USING (public.user_is_superadmin(auth.uid()));

-- ATTENDEES
-- Users can read/update their own attendee record
CREATE POLICY "attendees_own_select"
  ON public.attendees FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "attendees_own_update"
  ON public.attendees FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Anyone can insert (for registration)
CREATE POLICY "attendees_public_insert"
  ON public.attendees FOR INSERT
  WITH CHECK (true);

-- Superadmins can do everything
CREATE POLICY "attendees_superadmin"
  ON public.attendees FOR ALL
  USING (public.user_is_superadmin(auth.uid()));

-- REGISTRATIONS
-- Users can read their own registrations (via their attendee record)
CREATE POLICY "registrations_own_select"
  ON public.registrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.attendees a
      WHERE a.id = registrations.attendee_id
      AND a.user_id = auth.uid()
    )
  );

-- Anyone can insert (for registration)
CREATE POLICY "registrations_public_insert"
  ON public.registrations FOR INSERT
  WITH CHECK (true);

-- Superadmins can do everything
CREATE POLICY "registrations_superadmin"
  ON public.registrations FOR ALL
  USING (public.user_is_superadmin(auth.uid()));

-- VENUE_USERS
-- Users can read their own assignments
CREATE POLICY "venue_users_own_select"
  ON public.venue_users FOR SELECT
  USING (user_id = auth.uid());

-- Superadmins can do everything
CREATE POLICY "venue_users_superadmin"
  ON public.venue_users FOR ALL
  USING (public.user_is_superadmin(auth.uid()));

-- ORGANIZER_USERS
-- Users can read their own assignments
CREATE POLICY "organizer_users_own_select"
  ON public.organizer_users FOR SELECT
  USING (user_id = auth.uid());

-- Superadmins can do everything
CREATE POLICY "organizer_users_superadmin"
  ON public.organizer_users FOR ALL
  USING (public.user_is_superadmin(auth.uid()));

-- CHECKINS
-- Users can read their own checkins (via registration -> attendee)
CREATE POLICY "checkins_own_select"
  ON public.checkins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.registrations r
      JOIN public.attendees a ON a.id = r.attendee_id
      WHERE r.id = checkins.registration_id
      AND a.user_id = auth.uid()
    )
  );

-- Superadmins can do everything
CREATE POLICY "checkins_superadmin"
  ON public.checkins FOR ALL
  USING (public.user_is_superadmin(auth.uid()));

-- Staff can insert/update checkins (door staff)
CREATE POLICY "checkins_staff_insert"
  ON public.checkins FOR INSERT
  WITH CHECK (
    public.user_has_role(auth.uid(), 'door_staff'::user_role)
    OR public.user_has_role(auth.uid(), 'venue_admin'::user_role)
    OR public.user_has_role(auth.uid(), 'event_organizer'::user_role)
    OR public.user_is_superadmin(auth.uid())
  );

CREATE POLICY "checkins_staff_update"
  ON public.checkins FOR UPDATE
  USING (
    public.user_has_role(auth.uid(), 'door_staff'::user_role)
    OR public.user_has_role(auth.uid(), 'venue_admin'::user_role)
    OR public.user_has_role(auth.uid(), 'event_organizer'::user_role)
    OR public.user_is_superadmin(auth.uid())
  );

