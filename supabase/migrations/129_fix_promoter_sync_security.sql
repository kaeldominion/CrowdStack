-- Fix promoter name sync trigger security issue
-- The trigger functions need SECURITY DEFINER to access auth.users table
-- This fixes "permission denied for table users" error during registration

-- ============================================
-- 1. FIX: sync_promoter_name_from_attendee function
-- ============================================
CREATE OR REPLACE FUNCTION sync_promoter_name_from_attendee()
RETURNS TRIGGER AS $$
BEGIN
  -- If attendee name was updated and attendee has a user_id
  IF NEW.user_id IS NOT NULL AND (NEW.name IS DISTINCT FROM OLD.name) AND NEW.name IS NOT NULL AND TRIM(NEW.name) != '' THEN
    -- Update promoter name if promoter profile exists for this user
    -- Check both user_id and created_by for legacy support
    UPDATE public.promoters
    SET name = NEW.name,
        updated_at = NOW()
    WHERE (user_id = NEW.user_id OR created_by = NEW.user_id)
      AND name IS DISTINCT FROM NEW.name;  -- Only update if name actually changed
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. FIX: sync_promoter_name_on_attendee_insert function
-- ============================================
CREATE OR REPLACE FUNCTION sync_promoter_name_on_attendee_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- If attendee is created with a name and has a user_id
  IF NEW.user_id IS NOT NULL AND NEW.name IS NOT NULL AND TRIM(NEW.name) != '' THEN
    -- Update promoter name if promoter profile exists for this user
    -- Check both user_id and created_by for legacy support
    UPDATE public.promoters
    SET name = NEW.name,
        updated_at = NOW()
    WHERE (user_id = NEW.user_id OR created_by = NEW.user_id)
      AND (name IS NULL OR name = '' OR name = split_part((SELECT email FROM auth.users WHERE id = NEW.user_id), '@', 1));
    -- Only update if promoter name is empty/null or matches email (to avoid overwriting manually set names)
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON FUNCTION sync_promoter_name_from_attendee() IS 'Automatically syncs promoter name from attendee name when attendee name is updated. Uses SECURITY DEFINER to access auth.users.';
COMMENT ON FUNCTION sync_promoter_name_on_attendee_insert() IS 'Syncs promoter name when attendee profile is first created, if promoter name is empty or email-derived. Uses SECURITY DEFINER to access auth.users.';



