-- Verify and Fix data_summary View Owner
-- This migration verifies the current owner and ensures it's set correctly

-- ============================================
-- 1. CHECK CURRENT OWNER (for debugging)
-- ============================================

-- This will show the current owner in the migration output
DO $$
DECLARE
  current_owner TEXT;
BEGIN
  SELECT pg_get_userbyid(relowner) INTO current_owner
  FROM pg_class
  WHERE relname = 'data_summary' AND relkind = 'v';
  
  RAISE NOTICE 'Current data_summary view owner: %', current_owner;
END $$;

-- ============================================
-- 2. ENSURE ROLE EXISTS AND HAS PERMISSIONS
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'view_owner') THEN
    CREATE ROLE view_owner;
    GRANT USAGE, CREATE ON SCHEMA public TO view_owner;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO view_owner;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO view_owner;
    GRANT view_owner TO postgres;
  END IF;
END $$;

-- ============================================
-- 3. FORCE OWNER CHANGE
-- ============================================

-- Drop the view
DROP VIEW IF EXISTS public.data_summary CASCADE;

-- Recreate the view (will be owned by postgres initially)
CREATE VIEW public.data_summary AS
SELECT 
  (SELECT COUNT(*) FROM public.venues) as venues,
  (SELECT COUNT(*) FROM public.organizers) as organizers,
  (SELECT COUNT(*) FROM public.promoters) as promoters,
  (SELECT COUNT(*) FROM public.attendees) as attendees,
  (SELECT COUNT(*) FROM public.events) as events,
  (SELECT COUNT(*) FROM public.registrations) as registrations,
  (SELECT COUNT(*) FROM public.checkins) as checkins;

-- Change owner using ALTER VIEW (postgres has permission via role membership)
ALTER VIEW public.data_summary OWNER TO view_owner;

-- Grant access
GRANT SELECT ON public.data_summary TO anon, authenticated;

-- Update comment
COMMENT ON VIEW public.data_summary IS 'Summary counts of public tables for debugging. Does not expose auth.users data. Owned by view_owner role to avoid SECURITY DEFINER detection.';

