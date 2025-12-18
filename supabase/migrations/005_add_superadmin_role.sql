-- Add superadmin role to user_role enum
-- This migration adds the superadmin role for platform administrators

-- Add superadmin to the enum
-- Note: PostgreSQL doesn't support IF NOT EXISTS for ALTER TYPE ADD VALUE
-- This will error if the value already exists, which is fine - we can ignore that error
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'superadmin' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    ALTER TYPE user_role ADD VALUE 'superadmin';
  END IF;
END $$;

-- Commit the enum change before using it
-- Note: In Supabase, each migration runs in its own transaction, so we need to
-- create the function in a way that doesn't reference the enum value directly
-- until after the transaction commits. We'll use a workaround.

-- Helper function to check if user is superadmin
-- Using text comparison to avoid enum value reference in same transaction
CREATE OR REPLACE FUNCTION public.user_is_superadmin(user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = user_uuid 
    AND role::text = 'superadmin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Grant superadmin access to all tables (they bypass RLS)
-- Note: RLS policies will need to be updated to check for superadmin
-- For now, superadmin can be granted direct access via service role

COMMENT ON FUNCTION public.user_is_superadmin IS 'Check if a user has superadmin role';

