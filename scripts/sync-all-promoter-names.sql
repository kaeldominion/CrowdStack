-- ============================================
-- SYNC ALL PROMOTER NAMES FROM ATTENDEE NAMES
-- ============================================
-- This will update all promoters that have attendee profiles
-- but their names don't match

-- First, let's see what we're working with
SELECT 
  'BEFORE SYNC' as phase,
  COUNT(*) as total_promoters,
  COUNT(CASE WHEN p.user_id IS NOT NULL OR p.created_by IS NOT NULL THEN 1 END) as promoters_with_user,
  COUNT(CASE WHEN a.name IS NOT NULL AND a.name != '' THEN 1 END) as promoters_with_attendee_name,
  COUNT(CASE WHEN a.name IS NOT NULL AND a.name != '' AND p.name != a.name THEN 1 END) as promoters_needing_sync
FROM public.promoters p
LEFT JOIN public.attendees a ON (p.user_id = a.user_id OR p.created_by = a.user_id)
WHERE p.user_id IS NOT NULL OR p.created_by IS NOT NULL;

-- ============================================
-- SYNC PROMOTERS USING user_id
-- ============================================
WITH promoters_to_sync AS (
  SELECT 
    p.id as promoter_id,
    a.name as attendee_name,
    p.name as current_promoter_name
  FROM public.promoters p
  INNER JOIN public.attendees a ON p.user_id = a.user_id
  WHERE a.name IS NOT NULL
    AND a.name != ''
    AND TRIM(a.name) != ''
    AND (p.name IS NULL OR p.name = '' OR p.name != a.name)
)
UPDATE public.promoters p
SET name = pts.attendee_name,
    updated_at = NOW()
FROM promoters_to_sync pts
WHERE p.id = pts.promoter_id
RETURNING 
  p.id,
  pts.current_promoter_name as old_name,
  pts.attendee_name as new_name,
  'Updated via user_id' as method;

-- ============================================
-- SYNC PROMOTERS USING created_by (legacy)
-- ============================================
WITH promoters_to_sync AS (
  SELECT 
    p.id as promoter_id,
    a.name as attendee_name,
    p.name as current_promoter_name
  FROM public.promoters p
  INNER JOIN public.attendees a ON p.created_by = a.user_id
  WHERE p.user_id IS NULL  -- Only update if user_id is not set
    AND a.name IS NOT NULL
    AND a.name != ''
    AND TRIM(a.name) != ''
    AND (p.name IS NULL OR p.name = '' OR p.name != a.name)
)
UPDATE public.promoters p
SET name = pts.attendee_name,
    updated_at = NOW()
FROM promoters_to_sync pts
WHERE p.id = pts.promoter_id
RETURNING 
  p.id,
  pts.current_promoter_name as old_name,
  pts.attendee_name as new_name,
  'Updated via created_by' as method;

-- ============================================
-- SET user_id FOR PROMOTERS THAT ONLY HAVE created_by
-- ============================================
UPDATE public.promoters p
SET user_id = p.created_by
WHERE p.user_id IS NULL 
  AND p.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.promoters p2 
    WHERE p2.user_id = p.created_by 
      AND p2.id != p.id
  )
RETURNING 
  id,
  created_by as old_user_id,
  user_id as new_user_id,
  'Set user_id from created_by' as action;

-- ============================================
-- FINAL SUMMARY
-- ============================================
SELECT 
  'AFTER SYNC' as phase,
  COUNT(*) as total_promoters,
  COUNT(CASE WHEN p.user_id IS NOT NULL OR p.created_by IS NOT NULL THEN 1 END) as promoters_with_user,
  COUNT(CASE WHEN a.name IS NOT NULL AND a.name != '' THEN 1 END) as promoters_with_attendee_name,
  COUNT(CASE WHEN a.name IS NOT NULL AND a.name != '' AND p.name = a.name THEN 1 END) as promoters_synced,
  COUNT(CASE WHEN a.name IS NOT NULL AND a.name != '' AND p.name != a.name THEN 1 END) as promoters_still_unsynced
FROM public.promoters p
LEFT JOIN public.attendees a ON (p.user_id = a.user_id OR p.created_by = a.user_id)
WHERE p.user_id IS NOT NULL OR p.created_by IS NOT NULL;

-- ============================================
-- SHOW PROMOTERS THAT ARE STILL NOT SYNCED
-- ============================================
SELECT 
  p.id as promoter_id,
  p.name as promoter_name,
  a.name as attendee_name,
  u.email as user_email,
  CASE 
    WHEN a.name IS NULL THEN 'No attendee profile'
    WHEN a.name = '' THEN 'Attendee name is empty'
    ELSE 'Names are different (may be intentional)'
  END as reason_not_synced
FROM public.promoters p
LEFT JOIN public.attendees a ON (p.user_id = a.user_id OR p.created_by = a.user_id)
LEFT JOIN auth.users u ON (p.user_id = u.id OR p.created_by = u.id)
WHERE (p.user_id IS NOT NULL OR p.created_by IS NOT NULL)
  AND (
    a.name IS NULL 
    OR a.name = ''
    OR (a.name IS NOT NULL AND a.name != '' AND p.name != a.name)
  )
ORDER BY p.name;

