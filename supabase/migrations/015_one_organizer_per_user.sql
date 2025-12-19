-- Ensure each user can only be assigned to ONE organizer
-- This enforces the requirement: "many users but only one event organiser per user"

-- First check for violations and clean them up
DO $$
DECLARE
  violation_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO violation_count
  FROM (
    SELECT user_id, COUNT(*) as cnt
    FROM public.organizer_users
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) violations;
  
  IF violation_count > 0 THEN
    RAISE WARNING 'Found % users assigned to multiple organizers. Keeping only first assignment.', violation_count;
    -- Keep only the oldest assignment per user
    DELETE FROM public.organizer_users
    WHERE id NOT IN (
      SELECT DISTINCT ON (user_id) id
      FROM public.organizer_users
      ORDER BY user_id, assigned_at ASC, id ASC
    );
  END IF;
END $$;

-- Add unique constraint to enforce one organizer per user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'organizer_users_user_id_unique'
  ) THEN
    ALTER TABLE public.organizer_users 
    ADD CONSTRAINT organizer_users_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

COMMENT ON CONSTRAINT organizer_users_user_id_unique ON public.organizer_users IS 'Ensures each user can only be assigned to one organizer profile (many users per organizer, but one organizer per user)';

