-- Add manage_guests permission to organizer_users
-- This permission controls who can manage attendees, VIPs, and guest lists

-- ============================================
-- 1. ADD manage_guests TO EXISTING PERMISSIONS
-- ============================================

-- Add manage_guests field to all existing organizer_users permissions
-- Default to false, then we'll set it to true for admins
UPDATE public.organizer_users
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{manage_guests}',
  'false'::jsonb
)
WHERE permissions IS NULL 
   OR NOT (permissions ? 'manage_guests');

-- ============================================
-- 2. GRANT manage_guests TO ADMIN USERS
-- ============================================

-- Grant manage_guests to users with full_admin permission
UPDATE public.organizer_users
SET permissions = jsonb_set(
  permissions,
  '{manage_guests}',
  'true'::jsonb
)
WHERE (permissions->>'full_admin')::boolean = true;

-- Grant manage_guests to users with admin role (legacy, for backward compatibility)
UPDATE public.organizer_users
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{manage_guests}',
  'true'::jsonb
)
WHERE role = 'admin'
  AND ((permissions->>'full_admin')::boolean IS NULL OR (permissions->>'full_admin')::boolean = false);

-- ============================================
-- 3. UPDATE DEFAULT PERMISSIONS IN MIGRATION
-- ============================================

-- Note: The default permissions in migration 035_venue_organizer_permissions.sql
-- will need to be updated manually if that migration is re-run, but for existing
-- installations, this migration handles adding the field.

-- ============================================
-- 4. COMMENTS
-- ============================================

COMMENT ON COLUMN public.organizer_users.permissions IS 'JSONB object containing granular permissions. manage_guests controls access to manage attendees, VIPs, and guest lists. If full_admin is true, user has all permissions including manage_guests.';

