-- Test query to verify promoter name sync is working
-- This simulates what happens when a user updates their attendee name

-- ============================================
-- TEST: Check current state
-- ============================================
-- Replace 'USER_EMAIL_HERE' with the user's email
SELECT 
  'BEFORE UPDATE' as test_phase,
  u.email,
  a.name as attendee_name,
  p.name as promoter_name,
  CASE 
    WHEN p.name = a.name THEN '✅ Already synced'
    ELSE '⚠️ Not synced'
  END as status
FROM auth.users u
LEFT JOIN public.attendees a ON a.user_id = u.id
LEFT JOIN public.promoters p ON (p.user_id = u.id OR p.created_by = u.id)
WHERE u.email = 'USER_EMAIL_HERE';  -- ⬅️ CHANGE THIS

-- ============================================
-- TEST: Simulate name update (manual test)
-- ============================================
-- This will trigger the sync automatically
-- Replace 'USER_EMAIL_HERE' with the user's email
-- Replace 'New Name' with the new name you want to test
UPDATE public.attendees
SET name = 'New Name',  -- ⬅️ CHANGE THIS
    updated_at = NOW()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'USER_EMAIL_HERE'  -- ⬅️ CHANGE THIS
)
RETURNING 
  id,
  name as new_attendee_name,
  'Updated!' as status;

-- ============================================
-- TEST: Check if promoter name synced
-- ============================================
SELECT 
  'AFTER UPDATE' as test_phase,
  u.email,
  a.name as attendee_name,
  p.name as promoter_name,
  CASE 
    WHEN p.name = a.name THEN '✅ Synced! Trigger worked!'
    ELSE '❌ Not synced - trigger may not be working'
  END as status
FROM auth.users u
LEFT JOIN public.attendees a ON a.user_id = u.id
LEFT JOIN public.promoters p ON (p.user_id = u.id OR p.created_by = u.id)
WHERE u.email = 'USER_EMAIL_HERE';  -- ⬅️ CHANGE THIS

-- ============================================
-- VERIFY TRIGGER EXISTS
-- ============================================
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing
FROM information_schema.triggers
WHERE trigger_name LIKE '%promoter%name%'
ORDER BY trigger_name;

