-- Update RLS Policies for new user management structure
-- This migration updates policies to check both created_by and junction tables

-- ============================================
-- VENUES POLICIES - Update to check junction table
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Venue admins can read their venue" ON public.venues;
DROP POLICY IF EXISTS "Venue admins can manage their venue" ON public.venues;

-- New policy: Users assigned to venue via venue_users OR created_by
CREATE POLICY "Users can read venues they're assigned to"
  ON public.venues FOR SELECT
  USING (
    -- Check junction table
    EXISTS (
      SELECT 1 FROM public.venue_users vu
      WHERE vu.venue_id = venues.id
      AND vu.user_id = auth.uid()
    )
    -- OR check created_by (backward compatibility)
    OR created_by = auth.uid()
    -- OR superadmin
    OR public.user_is_superadmin(auth.uid())
  );

-- Users can manage venues they're assigned to as admin
CREATE POLICY "Venue admins can manage their venues"
  ON public.venues FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.venue_users vu
      WHERE vu.venue_id = venues.id
      AND vu.user_id = auth.uid()
      AND vu.role = 'admin'
    )
    OR created_by = auth.uid()
    OR public.user_is_superadmin(auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.venue_users vu
      WHERE vu.venue_id = venues.id
      AND vu.user_id = auth.uid()
      AND vu.role = 'admin'
    )
    OR created_by = auth.uid()
    OR public.user_is_superadmin(auth.uid())
  );

-- ============================================
-- ORGANIZERS POLICIES - Update to check junction table
-- ============================================

DROP POLICY IF EXISTS "Organizers can read their organizer record" ON public.organizers;
DROP POLICY IF EXISTS "Organizers can manage their organizer record" ON public.organizers;

CREATE POLICY "Users can read organizers they're assigned to"
  ON public.organizers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organizer_users ou
      WHERE ou.organizer_id = organizers.id
      AND ou.user_id = auth.uid()
    )
    OR created_by = auth.uid()
    OR public.user_is_superadmin(auth.uid())
  );

CREATE POLICY "Organizers can manage their organizers"
  ON public.organizers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organizer_users ou
      WHERE ou.organizer_id = organizers.id
      AND ou.user_id = auth.uid()
      AND ou.role = 'admin'
    )
    OR created_by = auth.uid()
    OR public.user_is_superadmin(auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizer_users ou
      WHERE ou.organizer_id = organizers.id
      AND ou.user_id = auth.uid()
      AND ou.role = 'admin'
    )
    OR created_by = auth.uid()
    OR public.user_is_superadmin(auth.uid())
  );

-- ============================================
-- PROMOTERS POLICIES - Update to check user_id
-- ============================================

DROP POLICY IF EXISTS "Promoters can read their promoter record" ON public.promoters;
DROP POLICY IF EXISTS "Promoters can update their promoter record" ON public.promoters;
DROP POLICY IF EXISTS "Venue admins and organizers can read promoters" ON public.promoters;

-- Promoters can read their own profile (via user_id)
CREATE POLICY "Promoters can read their own profile"
  ON public.promoters FOR SELECT
  USING (
    (user_id = auth.uid() AND public.user_has_role(auth.uid(), 'promoter'::user_role))
    OR created_by = auth.uid()
    OR public.user_is_superadmin(auth.uid())
  );

-- Promoters can update their own profile
CREATE POLICY "Promoters can update their own profile"
  ON public.promoters FOR UPDATE
  USING (
    user_id = auth.uid()
    OR public.user_is_superadmin(auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.user_is_superadmin(auth.uid())
  );

-- Venue admins and organizers can read all promoters (for assignment)
CREATE POLICY "Venue admins and organizers can read promoters"
  ON public.promoters FOR SELECT
  USING (
    public.user_has_role(auth.uid(), 'venue_admin'::user_role)
    OR public.user_has_role(auth.uid(), 'event_organizer'::user_role)
    OR public.user_is_superadmin(auth.uid())
  );

-- Anyone with promoter role can insert their own promoter profile
CREATE POLICY "Users can create their promoter profile"
  ON public.promoters FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND public.user_has_role(auth.uid(), 'promoter'::user_role)
  );

-- ============================================
-- UPDATE HELPER FUNCTIONS IN POLICIES
-- ============================================
-- Update the get_user_venue_id and get_user_organizer_id functions used in other policies
-- (These are already updated in migration 012, but we need to ensure policies use them correctly)

-- The helper functions now return multiple IDs, so we need to update policies that use them
-- For now, we'll update the event access policies to check junction tables directly

-- Update attendees policy to check junction tables
DROP POLICY IF EXISTS "Event access users can read attendees" ON public.attendees;

CREATE POLICY "Event access users can read attendees"
  ON public.attendees FOR SELECT
  USING (
    user_id = auth.uid() -- Users can always read their own attendee record
    OR public.user_is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.registrations r
      JOIN public.events e ON r.event_id = e.id
      WHERE r.attendee_id = attendees.id
      AND (
        -- Organizer of the event (check junction table)
        (public.user_has_role(auth.uid(), 'event_organizer'::user_role)
         AND EXISTS (
           SELECT 1 FROM public.organizer_users ou
           WHERE ou.organizer_id = e.organizer_id
           AND ou.user_id = auth.uid()
         ))
        OR (public.user_has_role(auth.uid(), 'event_organizer'::user_role)
            AND e.organizer_id IN (SELECT id FROM public.organizers WHERE created_by = auth.uid()))
        -- Venue admin of the event's venue (check junction table)
        OR (public.user_has_role(auth.uid(), 'venue_admin'::user_role)
            AND EXISTS (
              SELECT 1 FROM public.venue_users vu
              WHERE vu.venue_id = e.venue_id
              AND vu.user_id = auth.uid()
            ))
        OR (public.user_has_role(auth.uid(), 'venue_admin'::user_role)
            AND e.venue_id IN (SELECT id FROM public.venues WHERE created_by = auth.uid()))
        -- Promoter assigned to the event
        OR (public.user_has_role(auth.uid(), 'promoter'::user_role)
            AND EXISTS (
              SELECT 1 FROM public.event_promoters ep
              JOIN public.promoters p ON ep.promoter_id = p.id
              WHERE ep.event_id = e.id
              AND p.user_id = auth.uid()
            ))
        -- Door staff (can read for check-in)
        OR public.user_has_role(auth.uid(), 'door_staff'::user_role)
      )
    )
  );

-- Update events policies to check junction tables
DROP POLICY IF EXISTS "Organizers can read their events" ON public.events;
DROP POLICY IF EXISTS "Venue admins can read events at their venue" ON public.events;

CREATE POLICY "Organizers can read their events"
  ON public.events FOR SELECT
  USING (
    status = 'published'
    OR public.user_is_superadmin(auth.uid())
    OR (
      public.user_has_role(auth.uid(), 'event_organizer'::user_role)
      AND (
        EXISTS (
          SELECT 1 FROM public.organizer_users ou
          WHERE ou.organizer_id = events.organizer_id
          AND ou.user_id = auth.uid()
        )
        OR organizer_id IN (SELECT id FROM public.organizers WHERE created_by = auth.uid())
      )
    )
  );

CREATE POLICY "Venue admins can read events at their venue"
  ON public.events FOR SELECT
  USING (
    status = 'published'
    OR public.user_is_superadmin(auth.uid())
    OR (
      public.user_has_role(auth.uid(), 'venue_admin'::user_role)
      AND venue_id IS NOT NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.venue_users vu
          WHERE vu.venue_id = events.venue_id
          AND vu.user_id = auth.uid()
        )
        OR venue_id IN (SELECT id FROM public.venues WHERE created_by = auth.uid())
      )
    )
  );

COMMENT ON POLICY "Users can read venues they're assigned to" ON public.venues IS 'Users can read venues they are assigned to via venue_users table or created_by.';
COMMENT ON POLICY "Users can read organizers they're assigned to" ON public.organizers IS 'Users can read organizers they are assigned to via organizer_users table or created_by.';

