-- Migration: Sync promoter names from attendee names
-- This ensures promoter profiles stay in sync with attendee names

-- ============================================
-- 1. FUNCTION: Sync promoter name from attendee
-- ============================================
CREATE OR REPLACE FUNCTION sync_promoter_name_from_attendee()
RETURNS TRIGGER AS $$
BEGIN
  -- If attendee name was updated and attendee has a user_id
  IF NEW.user_id IS NOT NULL AND (NEW.name IS DISTINCT FROM OLD.name) THEN
    -- Update promoter name if promoter profile exists for this user
    UPDATE public.promoters
    SET name = NEW.name
    WHERE user_id = NEW.user_id
      AND (name IS NULL OR name = '' OR name = split_part((SELECT email FROM auth.users WHERE id = NEW.user_id), '@', 1));
    -- Only update if promoter name is empty/null or looks like it came from email
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. TRIGGER: Auto-sync on attendee updates
-- ============================================
DROP TRIGGER IF EXISTS trigger_sync_promoter_name_from_attendee ON public.attendees;

CREATE TRIGGER trigger_sync_promoter_name_from_attendee
  AFTER UPDATE OF name ON public.attendees
  FOR EACH ROW
  WHEN (NEW.name IS DISTINCT FROM OLD.name)
  EXECUTE FUNCTION sync_promoter_name_from_attendee();

-- ============================================
-- 3. FIX EXISTING PROMOTERS
-- ============================================
-- Update promoters that have names derived from email to use attendee names instead
-- Use a CTE to get user emails first, then update
WITH user_emails AS (
  SELECT id, email
  FROM auth.users
),
promoters_to_update AS (
  SELECT 
    p.id as promoter_id,
    a.name as attendee_name,
    split_part(u.email, '@', 1) as email_username
  FROM public.promoters p
  INNER JOIN public.attendees a ON p.user_id = a.user_id
  INNER JOIN user_emails u ON p.user_id = u.id
  WHERE a.name IS NOT NULL
    AND a.name != ''
    AND (
      -- Promoter name is empty/null
      p.name IS NULL 
      OR p.name = ''
      -- Or promoter name matches email username pattern
      OR p.name = split_part(u.email, '@', 1)
    )
    AND a.name != split_part(u.email, '@', 1)
)
UPDATE public.promoters p
SET name = ptu.attendee_name
FROM promoters_to_update ptu
WHERE p.id = ptu.promoter_id;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON FUNCTION sync_promoter_name_from_attendee() IS 'Automatically syncs promoter name from attendee name when attendee name is updated';
COMMENT ON TRIGGER trigger_sync_promoter_name_from_attendee ON public.attendees IS 'Triggers sync of promoter name when attendee name changes';

