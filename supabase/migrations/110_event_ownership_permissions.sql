-- Event Ownership & Enhanced Permissions
-- This migration adds user-based event ownership and new permission flags
-- ============================================

-- ============================================
-- 1. ADD OWNER_USER_ID TO EVENTS
-- ============================================

-- Add owner tracking - the user who owns this event
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id);

-- Index for looking up events by owner
CREATE INDEX IF NOT EXISTS idx_events_owner_user_id ON public.events(owner_user_id);

-- Backfill: Set owner to organizer's created_by for existing events
UPDATE public.events e
SET owner_user_id = o.created_by
FROM public.organizers o
WHERE e.organizer_id = o.id
AND e.owner_user_id IS NULL
AND o.created_by IS NOT NULL;

COMMENT ON COLUMN public.events.owner_user_id IS 'The user who owns this event. Has full access to all event settings and can transfer ownership.';

-- ============================================
-- 2. ADD NEW PERMISSION FLAGS TO VENUE_USERS
-- ============================================

-- Update the default permissions to include new flags
-- Note: We update the column default but existing rows keep their current permissions

-- Add new permission flags to venue_users permissions JSONB
-- We need to add defaults for new records and update existing ones
DO $$
DECLARE
  new_permissions JSONB := '{
    "closeout_event": false,
    "view_settings": false,
    "manage_door_staff": false,
    "view_financials": false
  }'::jsonb;
BEGIN
  -- Update existing venue_users to add new permission flags (defaulting to false)
  UPDATE public.venue_users
  SET permissions = permissions || new_permissions
  WHERE permissions IS NOT NULL
    AND NOT (permissions ? 'closeout_event');
END $$;

-- ============================================
-- 3. ADD NEW PERMISSION FLAGS TO ORGANIZER_USERS
-- ============================================

DO $$
DECLARE
  new_permissions JSONB := '{
    "closeout_event": false,
    "view_settings": false,
    "manage_door_staff": false,
    "view_financials": false
  }'::jsonb;
BEGIN
  -- Update existing organizer_users to add new permission flags (defaulting to false)
  UPDATE public.organizer_users
  SET permissions = permissions || new_permissions
  WHERE permissions IS NOT NULL
    AND NOT (permissions ? 'closeout_event');
END $$;

-- ============================================
-- 4. CREATE EVENT ACCESS HELPER FUNCTION
-- ============================================

-- Check if a user has access to an event and return their permission level
CREATE OR REPLACE FUNCTION public.get_user_event_access(
  user_uuid UUID,
  event_uuid UUID
)
RETURNS TABLE(
  has_access BOOLEAN,
  is_owner BOOLEAN,
  is_superadmin BOOLEAN,
  access_source TEXT,
  permissions JSONB
) AS $$
DECLARE
  v_event RECORD;
  v_is_superadmin BOOLEAN := false;
  v_organizer_permissions JSONB;
  v_venue_permissions JSONB;
BEGIN
  -- Get event details
  SELECT e.owner_user_id, e.organizer_id, e.venue_id
  INTO v_event
  FROM public.events e
  WHERE e.id = event_uuid;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false, false, 'none'::TEXT, '{}'::JSONB;
    RETURN;
  END IF;

  -- Check if superadmin
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = user_uuid AND ur.role = 'superadmin'
  ) INTO v_is_superadmin;

  IF v_is_superadmin THEN
    RETURN QUERY SELECT true, false, true, 'superadmin'::TEXT, 
      '{"full_admin": true}'::JSONB;
    RETURN;
  END IF;

  -- Check if event owner
  IF v_event.owner_user_id = user_uuid THEN
    RETURN QUERY SELECT true, true, false, 'owner'::TEXT,
      '{"full_admin": true}'::JSONB;
    RETURN;
  END IF;

  -- Check organizer team access
  IF v_event.organizer_id IS NOT NULL THEN
    -- Check if user is organizer creator
    IF EXISTS(
      SELECT 1 FROM public.organizers o
      WHERE o.id = v_event.organizer_id AND o.created_by = user_uuid
    ) THEN
      RETURN QUERY SELECT true, false, false, 'organizer_creator'::TEXT,
        '{"full_admin": true}'::JSONB;
      RETURN;
    END IF;

    -- Check organizer_users
    SELECT ou.permissions INTO v_organizer_permissions
    FROM public.organizer_users ou
    WHERE ou.organizer_id = v_event.organizer_id AND ou.user_id = user_uuid;

    IF v_organizer_permissions IS NOT NULL THEN
      RETURN QUERY SELECT true, false, false, 'organizer_team'::TEXT,
        v_organizer_permissions;
      RETURN;
    END IF;
  END IF;

  -- Check venue team access
  IF v_event.venue_id IS NOT NULL THEN
    -- Check if user is venue creator
    IF EXISTS(
      SELECT 1 FROM public.venues v
      WHERE v.id = v_event.venue_id AND v.created_by = user_uuid
    ) THEN
      RETURN QUERY SELECT true, false, false, 'venue_creator'::TEXT,
        '{"full_admin": true}'::JSONB;
      RETURN;
    END IF;

    -- Check venue_users
    SELECT vu.permissions INTO v_venue_permissions
    FROM public.venue_users vu
    WHERE vu.venue_id = v_event.venue_id AND vu.user_id = user_uuid;

    IF v_venue_permissions IS NOT NULL THEN
      RETURN QUERY SELECT true, false, false, 'venue_team'::TEXT,
        v_venue_permissions;
      RETURN;
    END IF;
  END IF;

  -- No access
  RETURN QUERY SELECT false, false, false, 'none'::TEXT, '{}'::JSONB;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. CREATE PERMISSION CHECK HELPER
-- ============================================

-- Check if user has a specific permission for an event
CREATE OR REPLACE FUNCTION public.user_has_event_permission(
  user_uuid UUID,
  event_uuid UUID,
  permission_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_access RECORD;
BEGIN
  -- Get user's access to this event
  SELECT * INTO v_access
  FROM public.get_user_event_access(user_uuid, event_uuid);

  -- No access at all
  IF NOT v_access.has_access THEN
    RETURN false;
  END IF;

  -- Owner, superadmin, or entity creator has all permissions
  IF v_access.is_owner OR v_access.is_superadmin OR 
     v_access.access_source IN ('organizer_creator', 'venue_creator') THEN
    RETURN true;
  END IF;

  -- Check if full_admin is true
  IF COALESCE((v_access.permissions->>'full_admin')::boolean, false) THEN
    RETURN true;
  END IF;

  -- Check specific permission
  RETURN COALESCE((v_access.permissions->>permission_name)::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_event_access IS 'Returns user access details for an event including source (owner, superadmin, organizer_team, venue_team) and permissions';
COMMENT ON FUNCTION public.user_has_event_permission IS 'Check if a user has a specific permission for an event. Owners, superadmins, and entity creators have all permissions.';

