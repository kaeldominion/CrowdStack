-- Door Staff Assignments
-- Allows venue admins and organizers to assign specific users as door staff for specific events

-- Create event_door_staff table
CREATE TABLE IF NOT EXISTS public.event_door_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Each user can only be assigned once per event
  UNIQUE(event_id, user_id)
);

-- Create indexes
CREATE INDEX idx_event_door_staff_event ON public.event_door_staff(event_id);
CREATE INDEX idx_event_door_staff_user ON public.event_door_staff(user_id);
CREATE INDEX idx_event_door_staff_status ON public.event_door_staff(status);

-- Enable RLS
ALTER TABLE public.event_door_staff ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Superadmins can do everything
CREATE POLICY "Superadmins can manage all door staff assignments"
  ON public.event_door_staff
  FOR ALL
  USING (public.user_has_role(auth.uid(), 'superadmin'::user_role))
  WITH CHECK (public.user_has_role(auth.uid(), 'superadmin'::user_role));

-- Venue admins can manage door staff for events at their venues
CREATE POLICY "Venue admins can manage door staff for their venue events"
  ON public.event_door_staff
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.venues v ON e.venue_id = v.id
      LEFT JOIN public.venue_users vu ON v.id = vu.venue_id
      WHERE e.id = event_door_staff.event_id
      AND (v.created_by = auth.uid() OR vu.user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.venues v ON e.venue_id = v.id
      LEFT JOIN public.venue_users vu ON v.id = vu.venue_id
      WHERE e.id = event_door_staff.event_id
      AND (v.created_by = auth.uid() OR vu.user_id = auth.uid())
    )
  );

-- Event organizers can manage door staff for their own events
CREATE POLICY "Organizers can manage door staff for their events"
  ON public.event_door_staff
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organizers o ON e.organizer_id = o.id
      LEFT JOIN public.organizer_users ou ON o.id = ou.organizer_id
      WHERE e.id = event_door_staff.event_id
      AND (o.created_by = auth.uid() OR ou.user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organizers o ON e.organizer_id = o.id
      LEFT JOIN public.organizer_users ou ON o.id = ou.organizer_id
      WHERE e.id = event_door_staff.event_id
      AND (o.created_by = auth.uid() OR ou.user_id = auth.uid())
    )
  );

-- Door staff can view their own assignments
CREATE POLICY "Door staff can view their own assignments"
  ON public.event_door_staff
  FOR SELECT
  USING (user_id = auth.uid());

-- Create door staff invite tokens table
CREATE TABLE IF NOT EXISTS public.door_staff_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  email TEXT, -- Optional: if inviting a specific email
  created_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on token for fast lookups
CREATE INDEX idx_door_staff_invites_token ON public.door_staff_invites(token);
CREATE INDEX idx_door_staff_invites_event ON public.door_staff_invites(event_id);

-- Enable RLS
ALTER TABLE public.door_staff_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for door_staff_invites

-- Superadmins can do everything
CREATE POLICY "Superadmins can manage all door staff invites"
  ON public.door_staff_invites
  FOR ALL
  USING (public.user_has_role(auth.uid(), 'superadmin'::user_role))
  WITH CHECK (public.user_has_role(auth.uid(), 'superadmin'::user_role));

-- Venue admins can manage invites for events at their venues
CREATE POLICY "Venue admins manage door staff invites"
  ON public.door_staff_invites
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.venues v ON e.venue_id = v.id
      LEFT JOIN public.venue_users vu ON v.id = vu.venue_id
      WHERE e.id = door_staff_invites.event_id
      AND (v.created_by = auth.uid() OR vu.user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.venues v ON e.venue_id = v.id
      LEFT JOIN public.venue_users vu ON v.id = vu.venue_id
      WHERE e.id = door_staff_invites.event_id
      AND (v.created_by = auth.uid() OR vu.user_id = auth.uid())
    )
  );

-- Organizers can manage invites for their events
CREATE POLICY "Organizers can manage door staff invites for their events"
  ON public.door_staff_invites
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organizers o ON e.organizer_id = o.id
      LEFT JOIN public.organizer_users ou ON o.id = ou.organizer_id
      WHERE e.id = door_staff_invites.event_id
      AND (o.created_by = auth.uid() OR ou.user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organizers o ON e.organizer_id = o.id
      LEFT JOIN public.organizer_users ou ON o.id = ou.organizer_id
      WHERE e.id = door_staff_invites.event_id
      AND (o.created_by = auth.uid() OR ou.user_id = auth.uid())
    )
  );

-- Anyone can read an invite by token (for accepting)
CREATE POLICY "Anyone can read invites by token"
  ON public.door_staff_invites
  FOR SELECT
  USING (true);

-- Function to assign door_staff role to a user
CREATE OR REPLACE FUNCTION public.ensure_door_staff_role(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Add door_staff role if not already present
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'door_staff')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically add door_staff role when assigned to an event
CREATE OR REPLACE FUNCTION public.trigger_ensure_door_staff_role()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.ensure_door_staff_role(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_door_staff_assigned
  AFTER INSERT ON public.event_door_staff
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_ensure_door_staff_role();

-- Create set_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger
CREATE TRIGGER set_event_door_staff_updated_at
  BEFORE UPDATE ON public.event_door_staff
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.event_door_staff IS 'Assigns users as door staff for specific events';
COMMENT ON TABLE public.door_staff_invites IS 'Invite tokens for door staff to join specific events';

