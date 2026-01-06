-- Diagnostic query to see promoter names and their relationships
-- This will help us understand why the update didn't match any rows

-- 1. Check promoters with user_id and their names
SELECT 
  p.id as promoter_id,
  p.name as promoter_name,
  p.user_id,
  p.created_by,
  a.name as attendee_name,
  a.user_id as attendee_user_id,
  u.email as user_email,
  split_part(u.email, '@', 1) as email_username,
  CASE 
    WHEN p.name IS NULL OR p.name = '' THEN 'empty'
    WHEN p.name = split_part(u.email, '@', 1) THEN 'matches_email'
    WHEN p.name = a.name THEN 'matches_attendee'
    ELSE 'different'
  END as name_status
FROM public.promoters p
LEFT JOIN public.attendees a ON p.user_id = a.user_id
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE p.user_id IS NOT NULL
ORDER BY p.name;

-- 2. Count promoters by status
SELECT 
  CASE 
    WHEN p.name IS NULL OR p.name = '' THEN 'empty'
    WHEN p.name = split_part(u.email, '@', 1) THEN 'matches_email'
    WHEN p.name = a.name THEN 'matches_attendee'
    ELSE 'different'
  END as name_status,
  COUNT(*) as count
FROM public.promoters p
LEFT JOIN public.attendees a ON p.user_id = a.user_id
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE p.user_id IS NOT NULL
GROUP BY name_status;

-- 3. Find promoters that SHOULD be updated (matching our criteria)
SELECT 
  p.id as promoter_id,
  p.name as current_promoter_name,
  a.name as attendee_name,
  split_part(u.email, '@', 1) as email_username,
  u.email as user_email
FROM public.promoters p
INNER JOIN public.attendees a ON p.user_id = a.user_id
INNER JOIN auth.users u ON p.user_id = u.id
WHERE a.name IS NOT NULL
  AND a.name != ''
  AND (
    p.name IS NULL 
    OR p.name = ''
    OR p.name = split_part(u.email, '@', 1)
  )
  AND a.name != split_part(u.email, '@', 1);

