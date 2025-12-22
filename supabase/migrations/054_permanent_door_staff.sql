-- Permanent Door Staff
-- Extends door staff to support permanent venue-wide or organizer-wide access

-- Add permanent door staff tables for venue-wide access
CREATE TABLE IF NOT EXISTS public.venue_door_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(venue_id, user_id)
);

-- Add permanent door staff tables for organizer-wide access
CREATE TABLE IF NOT EXISTS public.organizer_door_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES public.organizers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(organizer_id, user_id)
);

-- Add is_permanent flag to event_door_staff for upgrading to permanent
ALTER TABLE public.event_door_staff 
ADD COLUMN IF NOT EXISTS upgrade_to_permanent BOOLEAN DEFAULT false;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_venue_door_staff_venue ON public.venue_door_staff(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_door_staff_user ON public.venue_door_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_door_staff_status ON public.venue_door_staff(status);

CREATE INDEX IF NOT EXISTS idx_organizer_door_staff_organizer ON public.organizer_door_staff(organizer_id);
CREATE INDEX IF NOT EXISTS idx_organizer_door_staff_user ON public.organizer_door_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_organizer_door_staff_status ON public.organizer_door_staff(status);

-- Enable RLS
ALTER TABLE public.venue_door_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizer_door_staff ENABLE ROW LEVEL SECURITY;

-- RLS Policies for venue_door_staff

CREATE POLICY "Superadmins can manage all venue door staff"
  ON public.venue_door_staff
  FOR ALL
  USING (public.user_has_role(auth.uid(), 'superadmin'::user_role))
  WITH CHECK (public.user_has_role(auth.uid(), 'superadmin'::user_role));

CREATE POLICY "Venue admins can manage their venue door staff"
  ON public.venue_door_staff
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.venues v
      LEFT JOIN public.venue_users vu ON v.id = vu.venue_id
      WHERE v.id = venue_door_staff.venue_id
      AND (v.created_by = auth.uid() OR vu.user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.venues v
      LEFT JOIN public.venue_users vu ON v.id = vu.venue_id
      WHERE v.id = venue_door_staff.venue_id
      AND (v.created_by = auth.uid() OR vu.user_id = auth.uid())
    )
  );

CREATE POLICY "Door staff can view their own venue assignments"
  ON public.venue_door_staff
  FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policies for organizer_door_staff

CREATE POLICY "Superadmins can manage all organizer door staff"
  ON public.organizer_door_staff
  FOR ALL
  USING (public.user_has_role(auth.uid(), 'superadmin'::user_role))
  WITH CHECK (public.user_has_role(auth.uid(), 'superadmin'::user_role));

CREATE POLICY "Organizers can manage their organizer door staff"
  ON public.organizer_door_staff
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organizers o
      LEFT JOIN public.organizer_users ou ON o.id = ou.organizer_id
      WHERE o.id = organizer_door_staff.organizer_id
      AND (o.created_by = auth.uid() OR ou.user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizers o
      LEFT JOIN public.organizer_users ou ON o.id = ou.organizer_id
      WHERE o.id = organizer_door_staff.organizer_id
      AND (o.created_by = auth.uid() OR ou.user_id = auth.uid())
    )
  );

CREATE POLICY "Door staff can view their own organizer assignments"
  ON public.organizer_door_staff
  FOR SELECT
  USING (user_id = auth.uid());

-- Trigger for venue_door_staff to add door_staff role
CREATE TRIGGER on_venue_door_staff_assigned
  AFTER INSERT ON public.venue_door_staff
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_ensure_door_staff_role();

-- Trigger for organizer_door_staff to add door_staff role
CREATE TRIGGER on_organizer_door_staff_assigned
  AFTER INSERT ON public.organizer_door_staff
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_ensure_door_staff_role();

-- Add updated_at triggers
CREATE TRIGGER set_venue_door_staff_updated_at
  BEFORE UPDATE ON public.venue_door_staff
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_organizer_door_staff_updated_at
  BEFORE UPDATE ON public.organizer_door_staff
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Function to check if user has door access to an event
CREATE OR REPLACE FUNCTION public.user_has_door_access(p_user_id UUID, p_event_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_venue_id UUID;
  v_organizer_id UUID;
BEGIN
  -- Get event's venue and organizer
  SELECT venue_id, organizer_id INTO v_venue_id, v_organizer_id
  FROM public.events
  WHERE id = p_event_id;
  
  -- Check direct event assignment
  IF EXISTS (
    SELECT 1 FROM public.event_door_staff
    WHERE event_id = p_event_id AND user_id = p_user_id AND status = 'active'
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check venue-wide permanent access
  IF v_venue_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.venue_door_staff
    WHERE venue_id = v_venue_id AND user_id = p_user_id AND status = 'active'
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check organizer-wide permanent access
  IF v_organizer_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.organizer_door_staff
    WHERE organizer_id = v_organizer_id AND user_id = p_user_id AND status = 'active'
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.venue_door_staff IS 'Permanent door staff for venues - access to all venue events';
COMMENT ON TABLE public.organizer_door_staff IS 'Permanent door staff for organizers - access to all organizer events';
COMMENT ON FUNCTION public.user_has_door_access IS 'Check if user has door access to an event (direct, venue-wide, or organizer-wide)';

