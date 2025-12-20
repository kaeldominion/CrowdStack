-- RLS Policies for CrowdStack MVP
-- Implements role-based access control for all tables

-- Helper function to get user roles
CREATE OR REPLACE FUNCTION public.get_user_roles(user_uuid UUID)
RETURNS TABLE(role user_role) AS $$
  SELECT ur.role
  FROM public.user_roles ur
  WHERE ur.user_id = user_uuid;
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to check if user has role
CREATE OR REPLACE FUNCTION public.user_has_role(user_uuid UUID, check_role user_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = user_uuid AND role = check_role
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to get user's venue_id (for venue_admin)
CREATE OR REPLACE FUNCTION public.get_user_venue_id(user_uuid UUID)
RETURNS UUID AS $$
  SELECT v.id
  FROM public.venues v
  WHERE v.created_by = user_uuid
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to get user's organizer_id
CREATE OR REPLACE FUNCTION public.get_user_organizer_id(user_uuid UUID)
RETURNS UUID AS $$
  SELECT o.id
  FROM public.organizers o
  WHERE o.created_by = user_uuid
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to get user's promoter_id
CREATE OR REPLACE FUNCTION public.get_user_promoter_id(user_uuid UUID)
RETURNS UUID AS $$
  SELECT p.id
  FROM public.promoters p
  WHERE p.created_by = user_uuid
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to check if user is attendee for a registration
CREATE OR REPLACE FUNCTION public.is_attendee_for_registration(user_uuid UUID, reg_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.registrations r
    JOIN public.attendees a ON r.attendee_id = a.id
    WHERE r.id = reg_id AND a.user_id = user_uuid
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- USER ROLES POLICIES
-- ============================================

-- Users can read their own roles
CREATE POLICY "Users can read their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all roles (for invite acceptance)
-- This is handled via service role client, no policy needed

-- ============================================
-- INVITE TOKENS POLICIES
-- ============================================

-- Anyone can read unused invite tokens (for validation)
CREATE POLICY "Anyone can read unused invite tokens"
  ON public.invite_tokens FOR SELECT
  USING (used_at IS NULL);

-- Only service role can create/update invite tokens
-- Handled via service role client

-- ============================================
-- VENUES POLICIES
-- ============================================

-- Venue admins can read their venue
CREATE POLICY "Venue admins can read their venue"
  ON public.venues FOR SELECT
  USING (
    public.user_has_role(auth.uid(), 'venue_admin'::user_role)
    AND created_by = auth.uid()
  );

-- Venue admins can insert/update/delete their venue
CREATE POLICY "Venue admins can manage their venue"
  ON public.venues FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- ============================================
-- ORGANIZERS POLICIES
-- ============================================

-- Organizers can read their own organizer record
CREATE POLICY "Organizers can read their organizer record"
  ON public.organizers FOR SELECT
  USING (
    public.user_has_role(auth.uid(), 'event_organizer'::user_role)
    AND created_by = auth.uid()
  );

-- Organizers can insert/update their own record
CREATE POLICY "Organizers can manage their organizer record"
  ON public.organizers FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());


-- ============================================
-- PROMOTERS POLICIES
-- ============================================

-- Promoters can read their own promoter record
CREATE POLICY "Promoters can read their promoter record"
  ON public.promoters FOR SELECT
  USING (
    public.user_has_role(auth.uid(), 'promoter'::user_role)
    AND created_by = auth.uid()
  );

-- Promoters can update their own record
CREATE POLICY "Promoters can update their promoter record"
  ON public.promoters FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Venue admins and organizers can read all promoters (for assignment)
-- NOTE: This policy will be updated in migration 037 to restrict visibility
-- based on work history. Keeping this for backward compatibility during migration.
CREATE POLICY "Venue admins and organizers can read promoters"
  ON public.promoters FOR SELECT
  USING (
    public.user_has_role(auth.uid(), 'venue_admin'::user_role)
    OR public.user_has_role(auth.uid(), 'event_organizer'::user_role)
  );

-- ============================================
-- ATTENDEES POLICIES
-- ============================================

-- Attendees can read their own record
CREATE POLICY "Attendees can read their own record"
  ON public.attendees FOR SELECT
  USING (user_id = auth.uid());

-- Attendees can update their own record
CREATE POLICY "Attendees can update their own record"
  ON public.attendees FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users with event access can read attendees for their events
CREATE POLICY "Event access users can read attendees"
  ON public.attendees FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.registrations r
      JOIN public.events e ON r.event_id = e.id
      WHERE r.attendee_id = attendees.id
      AND (
        -- Organizer of the event
        (public.user_has_role(auth.uid(), 'event_organizer'::user_role)
         AND e.organizer_id = public.get_user_organizer_id(auth.uid()))
        -- Venue admin of the event's venue
        OR (public.user_has_role(auth.uid(), 'venue_admin'::user_role)
            AND e.venue_id = public.get_user_venue_id(auth.uid()))
        -- Promoter assigned to the event
        OR (public.user_has_role(auth.uid(), 'promoter'::user_role)
            AND EXISTS (
              SELECT 1 FROM public.event_promoters ep
              WHERE ep.event_id = e.id
              AND ep.promoter_id = public.get_user_promoter_id(auth.uid())
            ))
        -- Door staff (can read for check-in)
        OR public.user_has_role(auth.uid(), 'door_staff'::user_role)
      )
    )
  );

-- Public can insert attendees (for registration)
CREATE POLICY "Public can insert attendees"
  ON public.attendees FOR INSERT
  WITH CHECK (true);

-- ============================================
-- EVENTS POLICIES
-- ============================================

-- Published events are publicly readable
CREATE POLICY "Published events are publicly readable"
  ON public.events FOR SELECT
  USING (status = 'published');

-- Organizers can read their events
CREATE POLICY "Organizers can read their events"
  ON public.events FOR SELECT
  USING (
    public.user_has_role(auth.uid(), 'event_organizer'::user_role)
    AND organizer_id = public.get_user_organizer_id(auth.uid())
  );

-- Venue admins can read events at their venue
CREATE POLICY "Venue admins can read events at their venue"
  ON public.events FOR SELECT
  USING (
    public.user_has_role(auth.uid(), 'venue_admin'::user_role)
    AND venue_id = public.get_user_venue_id(auth.uid())
  );

-- Promoters can read events they're assigned to
CREATE POLICY "Promoters can read assigned events"
  ON public.events FOR SELECT
  USING (
    public.user_has_role(auth.uid(), 'promoter'::user_role)
    AND EXISTS (
      SELECT 1 FROM public.event_promoters ep
      WHERE ep.event_id = events.id
      AND ep.promoter_id = public.get_user_promoter_id(auth.uid())
    )
  );

-- Door staff can read events (for check-in)
CREATE POLICY "Door staff can read events"
  ON public.events FOR SELECT
  USING (public.user_has_role(auth.uid(), 'door_staff'::user_role));

-- Organizers can insert/update their events
CREATE POLICY "Organizers can manage their events"
  ON public.events FOR ALL
  USING (
    public.user_has_role(auth.uid(), 'event_organizer'::user_role)
    AND organizer_id = public.get_user_organizer_id(auth.uid())
  )
  WITH CHECK (
    public.user_has_role(auth.uid(), 'event_organizer'::user_role)
    AND organizer_id = public.get_user_organizer_id(auth.uid())
  );

-- ============================================
-- EVENT PROMOTERS POLICIES
-- ============================================

-- Organizers can read/manage event_promoters for their events
CREATE POLICY "Organizers can manage event promoters"
  ON public.event_promoters FOR ALL
  USING (
    public.user_has_role(auth.uid(), 'event_organizer'::user_role)
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_promoters.event_id
      AND e.organizer_id = public.get_user_organizer_id(auth.uid())
    )
  )
  WITH CHECK (
    public.user_has_role(auth.uid(), 'event_organizer'::user_role)
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_promoters.event_id
      AND e.organizer_id = public.get_user_organizer_id(auth.uid())
    )
  );

-- Promoters can read their own assignments
CREATE POLICY "Promoters can read their assignments"
  ON public.event_promoters FOR SELECT
  USING (
    public.user_has_role(auth.uid(), 'promoter'::user_role)
    AND promoter_id = public.get_user_promoter_id(auth.uid())
  );

-- ============================================
-- REGISTRATIONS POLICIES
-- ============================================

-- Public can insert registrations (for event registration)
CREATE POLICY "Public can insert registrations"
  ON public.registrations FOR INSERT
  WITH CHECK (true);

-- Attendees can read their own registrations
CREATE POLICY "Attendees can read their own registrations"
  ON public.registrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.attendees a
      WHERE a.id = registrations.attendee_id
      AND a.user_id = auth.uid()
    )
  );

-- Users with event access can read registrations
CREATE POLICY "Event access users can read registrations"
  ON public.registrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = registrations.event_id
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
        -- Door staff
        OR public.user_has_role(auth.uid(), 'door_staff'::user_role)
      )
    )
  );

-- ============================================
-- CHECKINS POLICIES
-- ============================================

-- Door staff can insert checkins
CREATE POLICY "Door staff can insert checkins"
  ON public.checkins FOR INSERT
  WITH CHECK (
    public.user_has_role(auth.uid(), 'door_staff'::user_role)
    AND checked_in_by = auth.uid()
  );

-- Door staff can update checkins (for undo)
CREATE POLICY "Door staff can update checkins"
  ON public.checkins FOR UPDATE
  USING (public.user_has_role(auth.uid(), 'door_staff'::user_role))
  WITH CHECK (public.user_has_role(auth.uid(), 'door_staff'::user_role));

-- Users with event access can read checkins
CREATE POLICY "Event access users can read checkins"
  ON public.checkins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.registrations r
      JOIN public.events e ON r.event_id = e.id
      WHERE r.id = checkins.registration_id
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
        -- Door staff
        OR public.user_has_role(auth.uid(), 'door_staff'::user_role)
      )
    )
  );

-- ============================================
-- EVENT QUESTIONS POLICIES
-- ============================================

-- Organizers can manage questions for their events
CREATE POLICY "Organizers can manage event questions"
  ON public.event_questions FOR ALL
  USING (
    public.user_has_role(auth.uid(), 'event_organizer'::user_role)
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_questions.event_id
      AND e.organizer_id = public.get_user_organizer_id(auth.uid())
    )
  )
  WITH CHECK (
    public.user_has_role(auth.uid(), 'event_organizer'::user_role)
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_questions.event_id
      AND e.organizer_id = public.get_user_organizer_id(auth.uid())
    )
  );

-- Public can read questions for published events
CREATE POLICY "Public can read questions for published events"
  ON public.event_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_questions.event_id
      AND e.status = 'published'
    )
  );

-- ============================================
-- EVENT ANSWERS POLICIES
-- ============================================

-- Public can insert answers (during registration)
CREATE POLICY "Public can insert answers"
  ON public.event_answers FOR INSERT
  WITH CHECK (true);

-- Attendees can read their own answers
CREATE POLICY "Attendees can read their own answers"
  ON public.event_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.registrations r
      JOIN public.attendees a ON r.attendee_id = a.id
      WHERE r.id = event_answers.registration_id
      AND a.user_id = auth.uid()
    )
  );

-- Event access users can read answers
CREATE POLICY "Event access users can read answers"
  ON public.event_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.registrations r
      JOIN public.events e ON r.event_id = e.id
      WHERE r.id = event_answers.registration_id
      AND (
        public.user_has_role(auth.uid(), 'event_organizer'::user_role)
        OR public.user_has_role(auth.uid(), 'venue_admin'::user_role)
        OR public.user_has_role(auth.uid(), 'promoter'::user_role)
      )
    )
  );

-- ============================================
-- XP LEDGER POLICIES
-- ============================================

-- Attendees can read their own XP
CREATE POLICY "Attendees can read their own XP"
  ON public.xp_ledger FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.attendees a
      WHERE a.id = xp_ledger.attendee_id
      AND a.user_id = auth.uid()
    )
  );

-- Event access users can read XP for their events
CREATE POLICY "Event access users can read XP"
  ON public.xp_ledger FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = xp_ledger.event_id
      AND (
        public.user_has_role(auth.uid(), 'event_organizer'::user_role)
        OR public.user_has_role(auth.uid(), 'venue_admin'::user_role)
      )
    )
  );

-- ============================================
-- GUEST FLAGS POLICIES
-- ============================================

-- Venue admins can manage flags for their venue
CREATE POLICY "Venue admins can manage guest flags"
  ON public.guest_flags FOR ALL
  USING (
    public.user_has_role(auth.uid(), 'venue_admin'::user_role)
    AND venue_id = public.get_user_venue_id(auth.uid())
  )
  WITH CHECK (
    public.user_has_role(auth.uid(), 'venue_admin'::user_role)
    AND venue_id = public.get_user_venue_id(auth.uid())
  );

-- ============================================
-- PHOTO ALBUMS POLICIES
-- ============================================

-- Published albums are publicly readable
CREATE POLICY "Published albums are publicly readable"
  ON public.photo_albums FOR SELECT
  USING (status = 'published');

-- Organizers can manage albums for their events
CREATE POLICY "Organizers can manage photo albums"
  ON public.photo_albums FOR ALL
  USING (
    public.user_has_role(auth.uid(), 'event_organizer'::user_role)
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = photo_albums.event_id
      AND e.organizer_id = public.get_user_organizer_id(auth.uid())
    )
  )
  WITH CHECK (
    public.user_has_role(auth.uid(), 'event_organizer'::user_role)
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = photo_albums.event_id
      AND e.organizer_id = public.get_user_organizer_id(auth.uid())
    )
  );

-- ============================================
-- PHOTOS POLICIES
-- ============================================

-- Photos follow album policies
CREATE POLICY "Photos follow album access"
  ON public.photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.photo_albums pa
      WHERE pa.id = photos.album_id
      AND (
        pa.status = 'published'
        OR (
          public.user_has_role(auth.uid(), 'event_organizer'::user_role)
          AND EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = pa.event_id
            AND e.organizer_id = public.get_user_organizer_id(auth.uid())
          )
        )
      )
    )
  );

-- Organizers can manage photos for their events
CREATE POLICY "Organizers can manage photos"
  ON public.photos FOR ALL
  USING (
    public.user_has_role(auth.uid(), 'event_organizer'::user_role)
    AND EXISTS (
      SELECT 1 FROM public.photo_albums pa
      JOIN public.events e ON pa.event_id = e.id
      WHERE pa.id = photos.album_id
      AND e.organizer_id = public.get_user_organizer_id(auth.uid())
    )
  )
  WITH CHECK (
    public.user_has_role(auth.uid(), 'event_organizer'::user_role)
    AND EXISTS (
      SELECT 1 FROM public.photo_albums pa
      JOIN public.events e ON pa.event_id = e.id
      WHERE pa.id = photos.album_id
      AND e.organizer_id = public.get_user_organizer_id(auth.uid())
    )
  );

-- ============================================
-- PAYOUT RUNS POLICIES
-- ============================================

-- Organizers can read/manage payouts for their events
CREATE POLICY "Organizers can manage payout runs"
  ON public.payout_runs FOR ALL
  USING (
    public.user_has_role(auth.uid(), 'event_organizer'::user_role)
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = payout_runs.event_id
      AND e.organizer_id = public.get_user_organizer_id(auth.uid())
    )
  )
  WITH CHECK (
    public.user_has_role(auth.uid(), 'event_organizer'::user_role)
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = payout_runs.event_id
      AND e.organizer_id = public.get_user_organizer_id(auth.uid())
    )
  );

-- Venue admins can read payouts for events at their venue
CREATE POLICY "Venue admins can read payout runs"
  ON public.payout_runs FOR SELECT
  USING (
    public.user_has_role(auth.uid(), 'venue_admin'::user_role)
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = payout_runs.event_id
      AND e.venue_id = public.get_user_venue_id(auth.uid())
    )
  );

-- Promoters can read their payout lines
CREATE POLICY "Promoters can read their payouts"
  ON public.payout_runs FOR SELECT
  USING (
    public.user_has_role(auth.uid(), 'promoter'::user_role)
    AND EXISTS (
      SELECT 1 FROM public.payout_lines pl
      WHERE pl.payout_run_id = payout_runs.id
      AND pl.promoter_id = public.get_user_promoter_id(auth.uid())
    )
  );

-- ============================================
-- PAYOUT LINES POLICIES
-- ============================================

-- Promoters can read their own payout lines
CREATE POLICY "Promoters can read their payout lines"
  ON public.payout_lines FOR SELECT
  USING (
    public.user_has_role(auth.uid(), 'promoter'::user_role)
    AND promoter_id = public.get_user_promoter_id(auth.uid())
  );

-- Organizers can read payout lines for their events
CREATE POLICY "Organizers can read payout lines"
  ON public.payout_lines FOR SELECT
  USING (
    public.user_has_role(auth.uid(), 'event_organizer'::user_role)
    AND EXISTS (
      SELECT 1 FROM public.payout_runs pr
      JOIN public.events e ON pr.event_id = e.id
      WHERE pr.id = payout_lines.payout_run_id
      AND e.organizer_id = public.get_user_organizer_id(auth.uid())
    )
  );

-- ============================================
-- AUDIT LOGS POLICIES
-- ============================================

-- Users can read their own audit logs
CREATE POLICY "Users can read their own audit logs"
  ON public.audit_logs FOR SELECT
  USING (user_id = auth.uid());

-- Event access users can read audit logs for their events
CREATE POLICY "Event access users can read audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    resource_type = 'event'
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id::text = resource_id::text
      AND (
        public.user_has_role(auth.uid(), 'event_organizer'::user_role)
        OR public.user_has_role(auth.uid(), 'venue_admin'::user_role)
      )
    )
  );

-- ============================================
-- MESSAGE LOGS POLICIES
-- ============================================

-- Users can read message logs for their email
CREATE POLICY "Users can read their message logs"
  ON public.message_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.attendees a
      WHERE a.email = message_logs.recipient
      AND a.user_id = auth.uid()
    )
  );

-- Service role manages message logs (no policy needed)

-- ============================================
-- EVENT OUTBOX POLICIES
-- ============================================

-- Service role manages outbox (no policy needed)
-- n8n will poll via service role client

