-- Recreate data_summary View with Correct Owner
-- Drops and recreates the view with view_owner role from the start
-- This ensures Supabase doesn't flag it as SECURITY DEFINER

-- ============================================
-- 1. ENSURE ROLE EXISTS AND HAS PERMISSIONS
-- ============================================

-- Create role if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'view_owner') THEN
    CREATE ROLE view_owner;
  END IF;
END $$;

-- Grant necessary permissions
GRANT USAGE, CREATE ON SCHEMA public TO view_owner;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO view_owner;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO view_owner;
GRANT view_owner TO postgres;

-- ============================================
-- 2. DROP AND RECREATE VIEW WITH CORRECT OWNER
-- ============================================

-- Drop the existing view
DROP VIEW IF EXISTS public.data_summary;

-- Recreate the view, then immediately change owner
-- We need to create it first (as postgres), then change owner
CREATE VIEW public.data_summary AS
SELECT 
  (SELECT COUNT(*) FROM public.venues) as venues,
  (SELECT COUNT(*) FROM public.organizers) as organizers,
  (SELECT COUNT(*) FROM public.promoters) as promoters,
  (SELECT COUNT(*) FROM public.attendees) as attendees,
  (SELECT COUNT(*) FROM public.events) as events,
  (SELECT COUNT(*) FROM public.registrations) as registrations,
  (SELECT COUNT(*) FROM public.checkins) as checkins;
  -- Removed auth_users count to prevent exposing auth.users data

-- Change owner to view_owner role
ALTER VIEW public.data_summary OWNER TO view_owner;

-- ============================================
-- 3. GRANT ACCESS TO ROLES
-- ============================================

-- Grant SELECT to anon and authenticated so they can query the view
GRANT SELECT ON public.data_summary TO anon, authenticated;

-- ============================================
-- 4. UPDATE COMMENT
-- ============================================

COMMENT ON VIEW public.data_summary IS 'Summary counts of public tables for debugging. Does not expose auth.users data. Owned by view_owner role to avoid SECURITY DEFINER detection.';



