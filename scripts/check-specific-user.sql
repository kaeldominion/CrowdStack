-- ============================================
-- CHECK SPECIFIC USER SETUP
-- ============================================
-- Replace 'USER_EMAIL_HERE' with the actual user's email address
-- Or replace with their UUID if you have it

WITH target_user AS (
  SELECT id, email, user_metadata, created_at
  FROM auth.users
  WHERE email = 'USER_EMAIL_HERE'  -- ⬅️ CHANGE THIS
     OR id::text = 'USER_EMAIL_HERE'  -- ⬅️ OR USE UUID HERE
)
SELECT 
  '👤 USER' as type,
  u.email as identifier,
  u.user_metadata->>'name' as name,
  u.created_at::text as created
FROM target_user u

UNION ALL

SELECT 
  '👥 ATTENDEE' as type,
  COALESCE(a.email, 'No email') as identifier,
  COALESCE(a.name || COALESCE(' ' || a.surname, ''), 'No attendee profile') as name,
  COALESCE(a.created_at::text, 'N/A') as created
FROM target_user u
LEFT JOIN public.attendees a ON a.user_id = u.id

UNION ALL

SELECT 
  '📢 PROMOTER' as type,
  COALESCE(p.email, 'No email') as identifier,
  COALESCE(p.name, 'No promoter profile') as name,
  COALESCE(p.created_at::text, 'N/A') as created
FROM target_user u
LEFT JOIN public.promoters p ON (p.user_id = u.id OR p.created_by = u.id);

-- ============================================
-- SYNC STATUS CHECK
-- ============================================
SELECT 
  u.email,
  u.user_metadata->>'name' as "Auth Name",
  a.name as "Attendee Name",
  p.name as "Promoter Name",
  split_part(u.email, '@', 1) as "Email Username",
  CASE 
    WHEN a.name IS NULL THEN '❌ No attendee profile'
    WHEN p.name IS NULL THEN '❌ No promoter profile'
    WHEN p.name = split_part(u.email, '@', 1) THEN '⚠️ Promoter name = email (NEEDS FIX)'
    WHEN p.name = a.name THEN '✅ Names are synced!'
    WHEN a.name IS NOT NULL AND p.name IS NOT NULL THEN '⚠️ Names are different'
    ELSE '❓ Unknown status'
  END as "Status",
  p.user_id IS NOT NULL as "Has user_id",
  p.created_by IS NOT NULL as "Has created_by"
FROM auth.users u
LEFT JOIN public.attendees a ON a.user_id = u.id
LEFT JOIN public.promoters p ON (p.user_id = u.id OR p.created_by = u.id)
WHERE u.email = 'USER_EMAIL_HERE'  -- ⬅️ CHANGE THIS
   OR u.id::text = 'USER_EMAIL_HERE';  -- ⬅️ OR USE UUID HERE

