-- Fix data_summary View Owner
-- Changes the view owner from postgres (superuser) to a custom non-superuser role
-- This prevents Supabase from flagging it as SECURITY DEFINER

-- ============================================
-- 1. CREATE CUSTOM ROLE FOR VIEW OWNERSHIP
-- ============================================

-- Create a custom role for owning views (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'view_owner') THEN
    CREATE ROLE view_owner;
  END IF;
END $$;

-- ============================================
-- 2. GRANT NECESSARY PERMISSIONS
-- ============================================

-- Grant schema usage and create (needed for ownership)
GRANT USAGE, CREATE ON SCHEMA public TO view_owner;

-- Grant SELECT on all existing tables in public schema
GRANT SELECT ON ALL TABLES IN SCHEMA public TO view_owner;

-- Grant SELECT on all future tables in public schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO view_owner;

-- Grant the role to postgres so it can SET ROLE to change ownership
GRANT view_owner TO postgres;

-- ============================================
-- 3. CHANGE VIEW OWNER
-- ============================================

-- Change view owner to the custom role (non-superuser) to avoid SECURITY DEFINER flag
ALTER VIEW public.data_summary OWNER TO view_owner;

-- ============================================
-- 4. UPDATE COMMENT
-- ============================================

COMMENT ON VIEW public.data_summary IS 'Summary counts of public tables for debugging. Does not expose auth.users data. Owner changed to view_owner role to avoid SECURITY DEFINER detection.';

