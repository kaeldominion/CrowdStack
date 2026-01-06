-- Find and fix all legacy promoters with missing emails
-- This will identify promoters that have user_id/created_by but no email

-- ============================================
-- 1. FIND PROMOTERS WITH MISSING EMAILS
-- ============================================
SELECT 
  p.id as promoter_id,
  p.name as promoter_name,
  p.email as promoter_email,
  p.user_id,
  p.created_by,
  u.email as user_email,
  a.name as attendee_name,
  CASE 
    WHEN p.user_id IS NOT NULL AND u.email IS NOT NULL THEN 'Has user_id, can fix'
    WHEN p.created_by IS NOT NULL AND u.email IS NOT NULL THEN 'Has created_by, can fix'
    ELSE 'No user link found'
  END as fix_status
FROM public.promoters p
LEFT JOIN auth.users u ON (p.user_id = u.id OR p.created_by = u.id)
LEFT JOIN public.attendees a ON (a.user_id = p.user_id OR a.user_id = p.created_by)
WHERE (p.email IS NULL OR p.email = '')
  AND (p.user_id IS NOT NULL OR p.created_by IS NOT NULL)
ORDER BY p.name;

-- ============================================
-- 2. FIX ALL PROMOTERS WITH MISSING EMAILS
-- ============================================
-- Update promoter emails from user emails
UPDATE public.promoters p
SET email = u.email,
    user_id = COALESCE(p.user_id, p.created_by),  -- Set user_id if missing
    updated_at = NOW()
FROM auth.users u
WHERE (p.user_id = u.id OR p.created_by = u.id)
  AND (p.email IS NULL OR p.email = '')
  AND u.email IS NOT NULL
RETURNING 
  p.id,
  p.name,
  p.email as new_email,
  p.user_id,
  'Updated!' as status;

-- ============================================
-- 3. SUMMARY
-- ============================================
SELECT 
  'SUMMARY' as report,
  COUNT(*) as total_promoters,
  COUNT(CASE WHEN p.email IS NOT NULL AND p.email != '' THEN 1 END) as promoters_with_email,
  COUNT(CASE WHEN (p.email IS NULL OR p.email = '') AND (p.user_id IS NOT NULL OR p.created_by IS NOT NULL) THEN 1 END) as promoters_missing_email,
  COUNT(CASE WHEN p.user_id IS NOT NULL THEN 1 END) as promoters_with_user_id
FROM public.promoters p;

