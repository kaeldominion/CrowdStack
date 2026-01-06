-- ============================================
-- MANUALLY FIX PROMOTER NAME FOR SPECIFIC USER
-- ============================================
-- Replace 'USER_EMAIL_HERE' with the actual user's email address

-- First, let's see what we're working with
SELECT 
  'BEFORE FIX' as status,
  u.email,
  a.name as attendee_name,
  p.name as current_promoter_name,
  split_part(u.email, '@', 1) as email_username,
  p.id as promoter_id
FROM auth.users u
LEFT JOIN public.attendees a ON a.user_id = u.id
LEFT JOIN public.promoters p ON (p.user_id = u.id OR p.created_by = u.id)
WHERE u.email = 'USER_EMAIL_HERE'  -- ⬅️ CHANGE THIS
   OR u.id::text = 'USER_EMAIL_HERE';  -- ⬅️ OR USE UUID HERE

-- Now fix it if attendee name exists and promoter name matches email
UPDATE public.promoters p
SET name = a.name
FROM auth.users u
INNER JOIN public.attendees a ON a.user_id = u.id
WHERE (p.user_id = u.id OR p.created_by = u.id)
  AND u.email = 'USER_EMAIL_HERE'  -- ⬅️ CHANGE THIS
  AND a.name IS NOT NULL
  AND a.name != ''
  AND (
    p.name IS NULL 
    OR p.name = ''
    OR p.name = split_part(u.email, '@', 1)
  )
RETURNING 
  p.id,
  p.name as new_promoter_name,
  'Updated!' as status;

-- Check the result
SELECT 
  'AFTER FIX' as status,
  u.email,
  a.name as attendee_name,
  p.name as promoter_name,
  CASE 
    WHEN p.name = a.name THEN '✅ Synced!'
    ELSE '⚠️ Still different'
  END as sync_status
FROM auth.users u
LEFT JOIN public.attendees a ON a.user_id = u.id
LEFT JOIN public.promoters p ON (p.user_id = u.id OR p.created_by = u.id)
WHERE u.email = 'USER_EMAIL_HERE'  -- ⬅️ CHANGE THIS
   OR u.id::text = 'USER_EMAIL_HERE';  -- ⬅️ OR USE UUID HERE

