-- Query to check a specific user's setup
-- Replace 'USER_EMAIL_OR_ID' with the user's email or UUID

-- Option 1: Search by email
-- Replace 'user@example.com' with the actual email
WITH target_user AS (
  SELECT id, email, user_metadata
  FROM auth.users
  WHERE email = 'USER_EMAIL_OR_ID'  -- Replace with actual email
     OR id::text = 'USER_EMAIL_OR_ID'  -- Or use UUID
)
SELECT 
  '=== USER INFO ===' as section,
  u.id as user_id,
  u.email as user_email,
  u.user_metadata->>'name' as auth_metadata_name,
  u.created_at as user_created_at
FROM target_user u

UNION ALL

SELECT 
  '=== ATTENDEE PROFILE ===' as section,
  a.user_id::text,
  a.email as attendee_email,
  a.name as attendee_name,
  a.created_at
FROM target_user u
LEFT JOIN public.attendees a ON a.user_id = u.id

UNION ALL

SELECT 
  '=== PROMOTER PROFILE ===' as section,
  p.user_id::text,
  p.email as promoter_email,
  p.name as promoter_name,
  p.created_at
FROM target_user u
LEFT JOIN public.promoters p ON (p.user_id = u.id OR p.created_by = u.id)

ORDER BY section, user_id;

-- Detailed view for a specific user
-- Replace 'USER_EMAIL_OR_ID' with the user's email or UUID
SELECT 
  'User Details' as info_type,
  jsonb_build_object(
    'user_id', u.id,
    'email', u.email,
    'auth_metadata_name', u.user_metadata->>'name',
    'created_at', u.created_at
  ) as details
FROM auth.users u
WHERE u.email = 'USER_EMAIL_OR_ID'  -- Replace with actual email
   OR u.id::text = 'USER_EMAIL_OR_ID'  -- Or use UUID

UNION ALL

SELECT 
  'Attendee Profile' as info_type,
  jsonb_build_object(
    'attendee_id', a.id,
    'name', a.name,
    'surname', a.surname,
    'email', a.email,
    'phone', a.phone,
    'user_id', a.user_id
  ) as details
FROM auth.users u
LEFT JOIN public.attendees a ON a.user_id = u.id
WHERE u.email = 'USER_EMAIL_OR_ID'  -- Replace with actual email
   OR u.id::text = 'USER_EMAIL_OR_ID'  -- Or use UUID

UNION ALL

SELECT 
  'Promoter Profile' as info_type,
  jsonb_build_object(
    'promoter_id', p.id,
    'name', p.name,
    'email', p.email,
    'phone', p.phone,
    'user_id', p.user_id,
    'created_by', p.created_by,
    'status', p.status
  ) as details
FROM auth.users u
LEFT JOIN public.promoters p ON (p.user_id = u.id OR p.created_by = u.id)
WHERE u.email = 'USER_EMAIL_OR_ID'  -- Replace with actual email
   OR u.id::text = 'USER_EMAIL_OR_ID';  -- Or use UUID

-- Check if names are in sync
SELECT 
  u.email,
  u.user_metadata->>'name' as auth_name,
  a.name as attendee_name,
  p.name as promoter_name,
  split_part(u.email, '@', 1) as email_username,
  CASE 
    WHEN a.name IS NULL THEN '❌ No attendee profile'
    WHEN p.name IS NULL THEN '❌ No promoter profile'
    WHEN p.name = split_part(u.email, '@', 1) THEN '⚠️ Promoter name matches email (needs fix)'
    WHEN p.name = a.name THEN '✅ Names are synced'
    ELSE '⚠️ Names are different'
  END as sync_status
FROM auth.users u
LEFT JOIN public.attendees a ON a.user_id = u.id
LEFT JOIN public.promoters p ON (p.user_id = u.id OR p.created_by = u.id)
WHERE u.email = 'USER_EMAIL_OR_ID'  -- Replace with actual email
   OR u.id::text = 'USER_EMAIL_OR_ID';  -- Or use UUID

