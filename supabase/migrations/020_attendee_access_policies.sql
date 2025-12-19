-- Attendee Data Access Policies
-- Implements strict scoped access to attendee data based on relationships
-- This replaces overly-permissive "Event access users can read attendees" policy

-- ============================================
-- ATTENDEES POLICIES - Scoped Access
-- ============================================

-- Drop the overly-permissive policy
DROP POLICY IF EXISTS "Event access users can read attendees" ON public.attendees;

-- Venue admins can only see attendees from events at their venue
CREATE POLICY "venue_attendee_access"
  ON public.attendees FOR SELECT
  USING (
    -- Superadmin bypass
    public.user_is_superadmin(auth.uid())
    OR
    -- Venue admin sees attendees from events at their venue
    (public.user_has_role(auth.uid(), 'venue_admin'::user_role)
     AND EXISTS (
       SELECT 1
       FROM public.registrations r
       JOIN public.events e ON r.event_id = e.id
       WHERE r.attendee_id = attendees.id
       AND e.venue_id = public.get_user_venue_id(auth.uid())
     ))
    -- Attendees can still read their own record (keep existing policy)
    OR (user_id = auth.uid())
    -- Door staff can see for check-in purposes (limited scope via registrations)
    OR (public.user_has_role(auth.uid(), 'door_staff'::user_role)
        AND EXISTS (
          SELECT 1
          FROM public.registrations r
          WHERE r.attendee_id = attendees.id
        ))
  );

-- Organizers can only see attendees from their own events
CREATE POLICY "organizer_attendee_access"
  ON public.attendees FOR SELECT
  USING (
    -- Superadmin bypass (handled above, but explicitly here for clarity)
    public.user_is_superadmin(auth.uid())
    OR
    -- Organizer sees attendees from their events only
    (public.user_has_role(auth.uid(), 'event_organizer'::user_role)
     AND EXISTS (
       SELECT 1
       FROM public.registrations r
       JOIN public.events e ON r.event_id = e.id
       WHERE r.attendee_id = attendees.id
       AND e.organizer_id = public.get_user_organizer_id(auth.uid())
     ))
    OR (user_id = auth.uid())
    OR (public.user_has_role(auth.uid(), 'door_staff'::user_role)
        AND EXISTS (
          SELECT 1
          FROM public.registrations r
          WHERE r.attendee_id = attendees.id
        ))
  );

-- Promoters can ONLY see attendees they directly referred (via referral_promoter_id)
-- This is stricter than before - promoters no longer see all event attendees
CREATE POLICY "promoter_referral_access"
  ON public.attendees FOR SELECT
  USING (
    -- Superadmin bypass
    public.user_is_superadmin(auth.uid())
    OR
    -- Promoter sees ONLY their direct referrals
    (public.user_has_role(auth.uid(), 'promoter'::user_role)
     AND EXISTS (
       SELECT 1
       FROM public.registrations r
       WHERE r.attendee_id = attendees.id
       AND r.referral_promoter_id = public.get_user_promoter_id(auth.uid())
     ))
    OR (user_id = auth.uid())
    OR (public.user_has_role(auth.uid(), 'door_staff'::user_role)
        AND EXISTS (
          SELECT 1
          FROM public.registrations r
          WHERE r.attendee_id = attendees.id
        ))
  );

-- Note: The above policies overlap (a user could have multiple roles)
-- PostgreSQL RLS uses OR logic, so if any policy allows access, access is granted
-- This is correct - we want defense-in-depth, and server-side code should also verify

-- ============================================
-- REGISTRATIONS POLICIES - Scoped Access
-- ============================================

-- Drop the overly-permissive policy
DROP POLICY IF EXISTS "Event access users can read registrations" ON public.registrations;

-- Venue admins can only see registrations for events at their venue
CREATE POLICY "venue_registration_access"
  ON public.registrations FOR SELECT
  USING (
    public.user_is_superadmin(auth.uid())
    OR
    (public.user_has_role(auth.uid(), 'venue_admin'::user_role)
     AND EXISTS (
       SELECT 1 FROM public.events e
       WHERE e.id = registrations.event_id
       AND e.venue_id = public.get_user_venue_id(auth.uid())
     ))
    OR EXISTS (
      SELECT 1 FROM public.attendees a
      WHERE a.id = registrations.attendee_id
      AND a.user_id = auth.uid()
    )
    OR public.user_has_role(auth.uid(), 'door_staff'::user_role)
  );

-- Organizers can only see registrations for their events
CREATE POLICY "organizer_registration_access"
  ON public.registrations FOR SELECT
  USING (
    public.user_is_superadmin(auth.uid())
    OR
    (public.user_has_role(auth.uid(), 'event_organizer'::user_role)
     AND EXISTS (
       SELECT 1 FROM public.events e
       WHERE e.id = registrations.event_id
       AND e.organizer_id = public.get_user_organizer_id(auth.uid())
     ))
    OR EXISTS (
      SELECT 1 FROM public.attendees a
      WHERE a.id = registrations.attendee_id
      AND a.user_id = auth.uid()
    )
    OR public.user_has_role(auth.uid(), 'door_staff'::user_role)
  );

-- Promoters can only see registrations where they are the referral promoter
CREATE POLICY "promoter_registration_access"
  ON public.registrations FOR SELECT
  USING (
    public.user_is_superadmin(auth.uid())
    OR
    (public.user_has_role(auth.uid(), 'promoter'::user_role)
     AND referral_promoter_id = public.get_user_promoter_id(auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.attendees a
      WHERE a.id = registrations.attendee_id
      AND a.user_id = auth.uid()
    )
    OR public.user_has_role(auth.uid(), 'door_staff'::user_role)
  );

-- ============================================
-- CHECKINS POLICIES - Scoped Access
-- ============================================

-- Drop the overly-permissive policy
DROP POLICY IF EXISTS "Event access users can read checkins" ON public.checkins;

-- Venue admins can only see checkins for events at their venue
CREATE POLICY "venue_checkin_access"
  ON public.checkins FOR SELECT
  USING (
    public.user_is_superadmin(auth.uid())
    OR
    (public.user_has_role(auth.uid(), 'venue_admin'::user_role)
     AND EXISTS (
       SELECT 1 FROM public.registrations r
       JOIN public.events e ON r.event_id = e.id
       WHERE r.id = checkins.registration_id
       AND e.venue_id = public.get_user_venue_id(auth.uid())
     ))
    OR public.user_has_role(auth.uid(), 'door_staff'::user_role)
  );

-- Organizers can only see checkins for their events
CREATE POLICY "organizer_checkin_access"
  ON public.checkins FOR SELECT
  USING (
    public.user_is_superadmin(auth.uid())
    OR
    (public.user_has_role(auth.uid(), 'event_organizer'::user_role)
     AND EXISTS (
       SELECT 1 FROM public.registrations r
       JOIN public.events e ON r.event_id = e.id
       WHERE r.id = checkins.registration_id
       AND e.organizer_id = public.get_user_organizer_id(auth.uid())
     ))
    OR public.user_has_role(auth.uid(), 'door_staff'::user_role)
  );

-- Promoters can only see checkins for registrations they referred
CREATE POLICY "promoter_checkin_access"
  ON public.checkins FOR SELECT
  USING (
    public.user_is_superadmin(auth.uid())
    OR
    (public.user_has_role(auth.uid(), 'promoter'::user_role)
     AND EXISTS (
       SELECT 1 FROM public.registrations r
       WHERE r.id = checkins.registration_id
       AND r.referral_promoter_id = public.get_user_promoter_id(auth.uid())
     ))
    OR public.user_has_role(auth.uid(), 'door_staff'::user_role)
  );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "venue_attendee_access" ON public.attendees IS 
  'Venue admins can only see attendees from events at their venue. Superadmins bypass.';
COMMENT ON POLICY "organizer_attendee_access" ON public.attendees IS 
  'Organizers can only see attendees from their own events. Superadmins bypass.';
COMMENT ON POLICY "promoter_referral_access" ON public.attendees IS 
  'Promoters can ONLY see attendees they directly referred via referral_promoter_id. Superadmins bypass.';

COMMENT ON POLICY "venue_registration_access" ON public.registrations IS 
  'Venue admins can only see registrations for events at their venue.';
COMMENT ON POLICY "organizer_registration_access" ON public.registrations IS 
  'Organizers can only see registrations for their events.';
COMMENT ON POLICY "promoter_registration_access" ON public.registrations IS 
  'Promoters can only see registrations where they are the referral promoter.';

COMMENT ON POLICY "venue_checkin_access" ON public.checkins IS 
  'Venue admins can only see checkins for events at their venue.';
COMMENT ON POLICY "organizer_checkin_access" ON public.checkins IS 
  'Organizers can only see checkins for their events.';
COMMENT ON POLICY "promoter_checkin_access" ON public.checkins IS 
  'Promoters can only see checkins for registrations they referred.';

