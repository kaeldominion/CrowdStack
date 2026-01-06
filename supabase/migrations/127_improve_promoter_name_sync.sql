-- Improve promoter name sync trigger
-- This ensures promoter names ALWAYS sync when attendee names are updated
-- Not just when the promoter name looks like it came from email

-- ============================================
-- 1. IMPROVED FUNCTION: Always sync promoter name
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
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. TRIGGER: Auto-sync on attendee name updates
-- ============================================
DROP TRIGGER IF EXISTS trigger_sync_promoter_name_from_attendee ON public.attendees;

CREATE TRIGGER trigger_sync_promoter_name_from_attendee
  AFTER UPDATE OF name ON public.attendees
  FOR EACH ROW
  WHEN (NEW.name IS DISTINCT FROM OLD.name AND NEW.name IS NOT NULL AND TRIM(NEW.name) != '')
  EXECUTE FUNCTION sync_promoter_name_from_attendee();

-- ============================================
-- 3. TRIGGER: Also sync when attendee is first created (if they already have a promoter profile)
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_promoter_name_on_attendee_insert ON public.attendees;

CREATE TRIGGER trigger_sync_promoter_name_on_attendee_insert
  AFTER INSERT ON public.attendees
  FOR EACH ROW
  WHEN (NEW.user_id IS NOT NULL AND NEW.name IS NOT NULL AND TRIM(NEW.name) != '')
  EXECUTE FUNCTION sync_promoter_name_on_attendee_insert();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON FUNCTION sync_promoter_name_from_attendee() IS 'Automatically syncs promoter name from attendee name when attendee name is updated. Always syncs, not just for email-derived names.';
COMMENT ON FUNCTION sync_promoter_name_on_attendee_insert() IS 'Syncs promoter name when attendee profile is first created, if promoter name is empty or email-derived.';
COMMENT ON TRIGGER trigger_sync_promoter_name_from_attendee ON public.attendees IS 'Triggers sync of promoter name when attendee name changes';
COMMENT ON TRIGGER trigger_sync_promoter_name_on_attendee_insert ON public.attendees IS 'Triggers sync of promoter name when attendee profile is first created';

