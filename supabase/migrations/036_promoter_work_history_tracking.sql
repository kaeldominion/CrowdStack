-- Track promoter work history and assignment relationships
-- This migration adds tracking for direct vs indirect promoter assignments
-- and enables filtering promoters by work history

-- ============================================
-- 1. ADD ASSIGNED_BY FIELD TO EVENT_PROMOTERS
-- ============================================
-- This tracks who assigned the promoter: 'venue' or 'organizer'
-- NULL means it was assigned by the event organizer (default behavior)

ALTER TABLE public.event_promoters
ADD COLUMN IF NOT EXISTS assigned_by TEXT CHECK (assigned_by IN ('venue', 'organizer'));

-- Set default for existing records: if event has venue_id, mark as potentially venue-assigned
-- Otherwise, mark as organizer-assigned
UPDATE public.event_promoters ep
SET assigned_by = CASE 
  WHEN EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = ep.event_id 
    AND e.venue_id IS NOT NULL
  ) THEN 'venue'
  ELSE 'organizer'
END
WHERE assigned_by IS NULL;

-- Set default to 'organizer' for new records
ALTER TABLE public.event_promoters
ALTER COLUMN assigned_by SET DEFAULT 'organizer';

-- ============================================
-- 2. CREATE HELPER FUNCTION TO GET PROMOTERS BY VENUE
-- ============================================

CREATE OR REPLACE FUNCTION public.get_promoters_for_venue(venue_uuid UUID)
RETURNS TABLE(promoter_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ep.promoter_id
  FROM public.event_promoters ep
  JOIN public.events e ON ep.event_id = e.id
  WHERE e.venue_id = venue_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. CREATE HELPER FUNCTION TO GET PROMOTERS BY ORGANIZER
-- ============================================

CREATE OR REPLACE FUNCTION public.get_promoters_for_organizer(organizer_uuid UUID)
RETURNS TABLE(promoter_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ep.promoter_id
  FROM public.event_promoters ep
  JOIN public.events e ON ep.event_id = e.id
  WHERE e.organizer_id = organizer_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. CREATE HELPER FUNCTION TO GET ORGANIZERS BY VENUE
-- ============================================

CREATE OR REPLACE FUNCTION public.get_organizers_for_venue(venue_uuid UUID)
RETURNS TABLE(organizer_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT e.organizer_id
  FROM public.events e
  WHERE e.venue_id = venue_uuid
  AND e.organizer_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. CREATE HELPER FUNCTION TO GET ORGANIZERS THAT WORKED TOGETHER
-- ============================================
-- Returns organizers that have worked on events together (same venue or co-organized events)

CREATE OR REPLACE FUNCTION public.get_organizers_worked_with(organizer_uuid UUID)
RETURNS TABLE(organizer_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT e2.organizer_id
  FROM public.events e1
  JOIN public.events e2 ON (
    -- Same venue
    (e1.venue_id IS NOT NULL AND e2.venue_id = e1.venue_id)
    OR
    -- Same event (co-organizers - if we add that feature later)
    (e1.id = e2.id)
  )
  WHERE e1.organizer_id = organizer_uuid
  AND e2.organizer_id != organizer_uuid
  AND e2.organizer_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON COLUMN public.event_promoters.assigned_by IS 'Tracks who assigned the promoter: "venue" for direct venue assignment, "organizer" for organizer assignment. Used for social proof and accountability.';
COMMENT ON FUNCTION public.get_promoters_for_venue IS 'Returns all promoter IDs that have worked at events for a given venue.';
COMMENT ON FUNCTION public.get_promoters_for_organizer IS 'Returns all promoter IDs that have worked on events for a given organizer.';
COMMENT ON FUNCTION public.get_organizers_for_venue IS 'Returns all organizer IDs that have created events at a given venue.';
COMMENT ON FUNCTION public.get_organizers_worked_with IS 'Returns organizer IDs that have worked together (same venue or co-organized events).';

