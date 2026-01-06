-- Fix Spencer's promoter account that's missing email
-- This account is linked to spencertarring@gmail.com but promoter profile has no email

-- ============================================
-- 1. FIND THE ACCOUNT
-- ============================================
SELECT 
  'FINDING ACCOUNT' as step,
  u.id as user_id,
  u.email as user_email,
  a.id as attendee_id,
  a.name as attendee_name,
  p.id as promoter_id,
  p.name as promoter_name,
  p.email as promoter_email,
  p.user_id as promoter_user_id,
  p.created_by as promoter_created_by
FROM auth.users u
LEFT JOIN public.attendees a ON a.user_id = u.id
LEFT JOIN public.promoters p ON (p.user_id = u.id OR p.created_by = u.id)
WHERE u.email = 'spencertarring@gmail.com'
   OR u.email LIKE '%spencertarring%'
   OR p.name = 'Spencer'
   OR p.name = 'Kadian'
ORDER BY u.email;

-- ============================================
-- 2. FIX PROMOTER EMAIL
-- ============================================
-- Update promoter email to match user email
UPDATE public.promoters p
SET email = u.email,
    user_id = u.id,  -- Ensure user_id is set
    updated_at = NOW()
FROM auth.users u
WHERE (p.user_id = u.id OR p.created_by = u.id)
  AND u.email = 'spencertarring@gmail.com'
  AND (p.email IS NULL OR p.email = '')
RETURNING 
  p.id,
  p.name,
  p.email as new_email,
  p.user_id,
  'Updated!' as status;

-- ============================================
-- 3. VERIFY THE FIX
-- ============================================
SELECT 
  'VERIFICATION' as step,
  u.email as user_email,
  a.name as attendee_name,
  p.name as promoter_name,
  p.email as promoter_email,
  p.user_id as promoter_user_id,
  CASE 
    WHEN p.email = u.email THEN '✅ Email synced'
    WHEN p.email IS NULL THEN '❌ Email still missing'
    ELSE '⚠️  Emails different'
  END as email_status,
  CASE 
    WHEN p.user_id = u.id THEN '✅ user_id set'
    WHEN p.created_by = u.id THEN '⚠️  Only created_by set'
    ELSE '❌ Not linked'
  END as link_status
FROM auth.users u
LEFT JOIN public.attendees a ON a.user_id = u.id
LEFT JOIN public.promoters p ON (p.user_id = u.id OR p.created_by = u.id)
WHERE u.email = 'spencertarring@gmail.com';

