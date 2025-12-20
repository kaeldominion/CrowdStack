-- Add granular permissions to venue_users and organizer_users
-- This migration adds a permissions JSONB column with granular permission flags

-- ============================================
-- 1. ADD PERMISSIONS COLUMN TO VENUE_USERS
-- ============================================

ALTER TABLE public.venue_users 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{
  "manage_users": false,
  "edit_profile": false,
  "add_events": false,
  "edit_events": false,
  "approve_events": false,
  "view_reports": false,
  "manage_promoters": false,
  "manage_organizers": false,
  "manage_guests": false,
  "full_admin": false
}'::jsonb;

-- Migrate existing 'admin' role to full_admin=true
UPDATE public.venue_users
SET permissions = jsonb_set(
  permissions,
  '{full_admin}',
  'true'::jsonb
)
WHERE role = 'admin';

-- Migrate existing 'staff' role to basic permissions (view only for now)
UPDATE public.venue_users
SET permissions = jsonb_set(
  permissions,
  '{view_reports}',
  'true'::jsonb
)
WHERE role = 'staff';

-- ============================================
-- 2. ADD PERMISSIONS COLUMN TO ORGANIZER_USERS
-- ============================================

ALTER TABLE public.organizer_users 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{
  "manage_users": false,
  "edit_profile": false,
  "add_events": false,
  "edit_events": false,
  "delete_events": false,
  "view_reports": false,
  "manage_promoters": false,
  "publish_photos": false,
  "manage_payouts": false,
  "full_admin": false
}'::jsonb;

-- Migrate existing 'admin' role to full_admin=true
UPDATE public.organizer_users
SET permissions = jsonb_set(
  permissions,
  '{full_admin}',
  'true'::jsonb
)
WHERE role = 'admin';

-- Migrate existing 'staff' role to basic permissions
UPDATE public.organizer_users
SET permissions = jsonb_set(
  permissions,
  '{view_reports}',
  'true'::jsonb
)
WHERE role = 'staff';

-- ============================================
-- 3. CREATE HELPER FUNCTION TO CHECK PERMISSIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.user_has_venue_permission(
  user_uuid UUID,
  venue_uuid UUID,
  permission_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_permissions JSONB;
  is_full_admin BOOLEAN;
BEGIN
  -- Get user's permissions for this venue
  SELECT permissions INTO user_permissions
  FROM public.venue_users
  WHERE user_id = user_uuid AND venue_id = venue_uuid;

  -- If no assignment found, check if user is creator
  IF user_permissions IS NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.venues
      WHERE id = venue_uuid AND created_by = user_uuid
    ) INTO is_full_admin;
    
    -- Creator has all permissions
    RETURN is_full_admin;
  END IF;

  -- Check if full_admin is true
  is_full_admin := COALESCE((user_permissions->>'full_admin')::boolean, false);
  IF is_full_admin THEN
    RETURN true;
  END IF;

  -- Check specific permission
  RETURN COALESCE((user_permissions->>permission_name)::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.user_has_organizer_permission(
  user_uuid UUID,
  organizer_uuid UUID,
  permission_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_permissions JSONB;
  is_full_admin BOOLEAN;
BEGIN
  -- Get user's permissions for this organizer
  SELECT permissions INTO user_permissions
  FROM public.organizer_users
  WHERE user_id = user_uuid AND organizer_id = organizer_uuid;

  -- If no assignment found, check if user is creator
  IF user_permissions IS NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.organizers
      WHERE id = organizer_uuid AND created_by = user_uuid
    ) INTO is_full_admin;
    
    -- Creator has all permissions
    RETURN is_full_admin;
  END IF;

  -- Check if full_admin is true
  is_full_admin := COALESCE((user_permissions->>'full_admin')::boolean, false);
  IF is_full_admin THEN
    RETURN true;
  END IF;

  -- Check specific permission
  RETURN COALESCE((user_permissions->>permission_name)::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining permissions structure
COMMENT ON COLUMN public.venue_users.permissions IS 'JSONB object containing granular permissions. If full_admin is true, user has all permissions. Otherwise, check individual permission flags.';
COMMENT ON COLUMN public.organizer_users.permissions IS 'JSONB object containing granular permissions. If full_admin is true, user has all permissions. Otherwise, check individual permission flags.';

COMMENT ON FUNCTION public.user_has_venue_permission IS 'Check if a user has a specific permission for a venue. Returns true if user is venue creator, has full_admin=true, or has the specific permission=true.';
COMMENT ON FUNCTION public.user_has_organizer_permission IS 'Check if a user has a specific permission for an organizer. Returns true if user is organizer creator, has full_admin=true, or has the specific permission=true.';


