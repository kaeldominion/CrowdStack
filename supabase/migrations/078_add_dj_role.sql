-- Add DJ role to user_role enum
-- This migration adds the dj role for DJ profiles

-- Add dj to the enum
-- Note: PostgreSQL doesn't support IF NOT EXISTS for ALTER TYPE ADD VALUE
-- This will error if the value already exists, which is fine - we can ignore that error
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'dj' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    ALTER TYPE user_role ADD VALUE 'dj';
  END IF;
END $$;

COMMENT ON TYPE user_role IS 'User role enum including venue_admin, event_organizer, promoter, door_staff, attendee, superadmin, and dj';

