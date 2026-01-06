-- Comprehensive fix for promoter names derived from email
-- This checks both user_id and created_by to catch all promoters

-- First, update promoters using user_id
WITH user_emails AS (
  SELECT id, email
  FROM auth.users
),
promoters_to_update_by_user_id AS (
  SELECT 
    p.id as promoter_id,
    a.name as attendee_name,
    split_part(u.email, '@', 1) as email_username,
    p.name as current_name
  FROM public.promoters p
  INNER JOIN public.attendees a ON p.user_id = a.user_id
  INNER JOIN user_emails u ON p.user_id = u.id
  WHERE a.name IS NOT NULL
    AND a.name != ''
    AND TRIM(a.name) != ''
    AND (
      p.name IS NULL 
      OR p.name = ''
      OR TRIM(p.name) = split_part(u.email, '@', 1)
    )
    AND TRIM(a.name) != split_part(u.email, '@', 1)
)
UPDATE public.promoters p
SET name = ptu.attendee_name
FROM promoters_to_update_by_user_id ptu
WHERE p.id = ptu.promoter_id;

-- Second, update promoters using created_by (for legacy promoters without user_id)
WITH user_emails AS (
  SELECT id, email
  FROM auth.users
),
promoters_to_update_by_created_by AS (
  SELECT 
    p.id as promoter_id,
    a.name as attendee_name,
    split_part(u.email, '@', 1) as email_username,
    p.name as current_name
  FROM public.promoters p
  INNER JOIN public.attendees a ON p.created_by = a.user_id
  INNER JOIN user_emails u ON p.created_by = u.id
  WHERE p.user_id IS NULL  -- Only update if user_id is not set
    AND a.name IS NOT NULL
    AND a.name != ''
    AND TRIM(a.name) != ''
    AND (
      p.name IS NULL 
      OR p.name = ''
      OR TRIM(p.name) = split_part(u.email, '@', 1)
    )
    AND TRIM(a.name) != split_part(u.email, '@', 1)
)
UPDATE public.promoters p
SET name = ptu.attendee_name
FROM promoters_to_update_by_created_by ptu
WHERE p.id = ptu.promoter_id;

-- Also set user_id for promoters that have created_by but no user_id
UPDATE public.promoters p
SET user_id = p.created_by
WHERE p.user_id IS NULL 
  AND p.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.promoters p2 
    WHERE p2.user_id = p.created_by AND p2.id != p.id
  );

