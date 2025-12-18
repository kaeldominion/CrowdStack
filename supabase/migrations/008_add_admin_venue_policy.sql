-- Add RLS policy to allow superadmins to read all venues
-- This ensures admin pages can see all data

-- Superadmins can read all venues
CREATE POLICY "Superadmins can read all venues"
  ON public.venues FOR SELECT
  USING (public.user_has_role(auth.uid(), 'superadmin'::user_role));

-- Superadmins can read all organizers
CREATE POLICY "Superadmins can read all organizers"
  ON public.organizers FOR SELECT
  USING (public.user_has_role(auth.uid(), 'superadmin'::user_role));

-- Superadmins can read all promoters
CREATE POLICY "Superadmins can read all promoters"
  ON public.promoters FOR SELECT
  USING (public.user_has_role(auth.uid(), 'superadmin'::user_role));

-- Superadmins can read all events
CREATE POLICY "Superadmins can read all events"
  ON public.events FOR SELECT
  USING (public.user_has_role(auth.uid(), 'superadmin'::user_role));

-- Superadmins can read all attendees
CREATE POLICY "Superadmins can read all attendees"
  ON public.attendees FOR SELECT
  USING (public.user_has_role(auth.uid(), 'superadmin'::user_role));

-- Superadmins can read all registrations
CREATE POLICY "Superadmins can read all registrations"
  ON public.registrations FOR SELECT
  USING (public.user_has_role(auth.uid(), 'superadmin'::user_role));

-- Superadmins can read all checkins
CREATE POLICY "Superadmins can read all checkins"
  ON public.checkins FOR SELECT
  USING (public.user_has_role(auth.uid(), 'superadmin'::user_role));

-- Superadmins can read all guest flags
CREATE POLICY "Superadmins can read all guest flags"
  ON public.guest_flags FOR SELECT
  USING (public.user_has_role(auth.uid(), 'superadmin'::user_role));

-- Superadmins can read all event promoters
CREATE POLICY "Superadmins can read all event promoters"
  ON public.event_promoters FOR SELECT
  USING (public.user_has_role(auth.uid(), 'superadmin'::user_role));

