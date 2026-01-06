-- Manual fix for promoter names derived from email
-- This migration re-runs the promoter name sync to fix any that were missed

-- Update promoters that have names derived from email to use attendee names instead
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

