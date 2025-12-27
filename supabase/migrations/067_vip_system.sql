-- VIP System Migration
-- Implements hybrid VIP: Global VIP + Scoped VIP (venue, organizer)
-- Manual marking now, with hooks for future auto-VIP based on XP

-- ============================================
-- 1. GLOBAL VIP (on attendees table)
-- ============================================

ALTER TABLE public.attendees
ADD COLUMN IF NOT EXISTS is_global_vip BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS global_vip_reason TEXT,
ADD COLUMN IF NOT EXISTS global_vip_granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS global_vip_granted_at TIMESTAMP WITH TIME ZONE;

-- Index for quick VIP lookups
CREATE INDEX IF NOT EXISTS idx_attendees_global_vip ON public.attendees(is_global_vip) WHERE is_global_vip = true;

COMMENT ON COLUMN public.attendees.is_global_vip IS 'Platform-wide VIP status - benefits everywhere';
COMMENT ON COLUMN public.attendees.global_vip_reason IS 'Why this user is a global VIP (manual note or auto reason like "Platinum Level")';
COMMENT ON COLUMN public.attendees.global_vip_granted_by IS 'Who granted global VIP status (NULL for auto-granted)';
COMMENT ON COLUMN public.attendees.global_vip_granted_at IS 'When global VIP status was granted';

-- ============================================
-- 2. VENUE VIP (scoped to specific venue)
-- ============================================

CREATE TABLE IF NOT EXISTS public.venue_vips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  attendee_id UUID NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  reason TEXT,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(venue_id, attendee_id)
);

CREATE INDEX IF NOT EXISTS idx_venue_vips_venue_id ON public.venue_vips(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_vips_attendee_id ON public.venue_vips(attendee_id);

COMMENT ON TABLE public.venue_vips IS 'Venue-specific VIP status - benefits only at this venue';

-- ============================================
-- 3. ORGANIZER VIP (scoped to specific organizer)
-- ============================================

CREATE TABLE IF NOT EXISTS public.organizer_vips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES public.organizers(id) ON DELETE CASCADE,
  attendee_id UUID NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  reason TEXT,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organizer_id, attendee_id)
);

CREATE INDEX IF NOT EXISTS idx_organizer_vips_organizer_id ON public.organizer_vips(organizer_id);
CREATE INDEX IF NOT EXISTS idx_organizer_vips_attendee_id ON public.organizer_vips(attendee_id);

COMMENT ON TABLE public.organizer_vips IS 'Organizer-specific VIP status - benefits at this organizer''s events';

-- ============================================
-- 4. RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE public.venue_vips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizer_vips ENABLE ROW LEVEL SECURITY;

-- Venue VIPs: Venue admins can manage, all authenticated can read
CREATE POLICY "venue_vips_read_authenticated" ON public.venue_vips
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "venue_vips_insert_venue_admin" ON public.venue_vips
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.venue_users vu
      WHERE vu.venue_id = venue_vips.venue_id
      AND vu.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'superadmin'
    )
  );

CREATE POLICY "venue_vips_delete_venue_admin" ON public.venue_vips
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.venue_users vu
      WHERE vu.venue_id = venue_vips.venue_id
      AND vu.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'superadmin'
    )
  );

-- Organizer VIPs: Organizer users can manage, all authenticated can read
CREATE POLICY "organizer_vips_read_authenticated" ON public.organizer_vips
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "organizer_vips_insert_organizer_user" ON public.organizer_vips
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizer_users ou
      WHERE ou.organizer_id = organizer_vips.organizer_id
      AND ou.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'superadmin'
    )
  );

CREATE POLICY "organizer_vips_delete_organizer_user" ON public.organizer_vips
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organizer_users ou
      WHERE ou.organizer_id = organizer_vips.organizer_id
      AND ou.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'superadmin'
    )
  );

-- ============================================
-- 5. HELPER FUNCTION: Check VIP status for event
-- ============================================

CREATE OR REPLACE FUNCTION public.get_attendee_vip_status(
  p_attendee_id UUID,
  p_event_id UUID DEFAULT NULL
)
RETURNS TABLE (
  is_global_vip BOOLEAN,
  is_venue_vip BOOLEAN,
  is_organizer_vip BOOLEAN,
  vip_level TEXT,
  vip_reasons TEXT[]
) AS $$
DECLARE
  v_venue_id UUID;
  v_organizer_id UUID;
  v_global_vip BOOLEAN;
  v_venue_vip BOOLEAN := false;
  v_organizer_vip BOOLEAN := false;
  v_reasons TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Get attendee's global VIP status
  SELECT a.is_global_vip INTO v_global_vip
  FROM public.attendees a
  WHERE a.id = p_attendee_id;
  
  IF v_global_vip THEN
    v_reasons := array_append(v_reasons, 'Global VIP');
  END IF;
  
  -- If event_id provided, check venue and organizer VIP
  IF p_event_id IS NOT NULL THEN
    SELECT e.venue_id, e.organizer_id INTO v_venue_id, v_organizer_id
    FROM public.events e
    WHERE e.id = p_event_id;
    
    -- Check venue VIP
    IF v_venue_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.venue_vips vv
        WHERE vv.venue_id = v_venue_id
        AND vv.attendee_id = p_attendee_id
      ) INTO v_venue_vip;
      
      IF v_venue_vip THEN
        v_reasons := array_append(v_reasons, 'Venue VIP');
      END IF;
    END IF;
    
    -- Check organizer VIP
    IF v_organizer_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.organizer_vips ov
        WHERE ov.organizer_id = v_organizer_id
        AND ov.attendee_id = p_attendee_id
      ) INTO v_organizer_vip;
      
      IF v_organizer_vip THEN
        v_reasons := array_append(v_reasons, 'Organizer VIP');
      END IF;
    END IF;
  END IF;
  
  RETURN QUERY SELECT 
    COALESCE(v_global_vip, false),
    v_venue_vip,
    v_organizer_vip,
    CASE 
      WHEN v_global_vip THEN 'global'
      WHEN v_venue_vip OR v_organizer_vip THEN 'scoped'
      ELSE 'none'
    END,
    v_reasons;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION public.get_attendee_vip_status IS 'Returns VIP status for an attendee, optionally scoped to an event context';

-- ============================================
-- 6. FUTURE: Auto-VIP trigger based on XP level
-- ============================================

-- This trigger can be enabled later when XP-based auto-VIP is ready
-- CREATE OR REPLACE FUNCTION public.auto_grant_global_vip()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   -- Auto-grant global VIP when user reaches Platinum level (40+)
--   IF NEW.total_xp >= (SELECT xp_required FROM xp_levels WHERE level = 40) THEN
--     UPDATE public.attendees
--     SET is_global_vip = true,
--         global_vip_reason = 'Platinum Level Achievement',
--         global_vip_granted_at = NOW()
--     WHERE user_id = NEW.user_id
--     AND is_global_vip = false;
--   END IF;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;


