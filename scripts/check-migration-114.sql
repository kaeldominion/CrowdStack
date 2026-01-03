-- Check if migration 114_fix_security_linter_issues.sql was applied
-- Run this in Supabase SQL Editor to verify

-- ============================================
-- 1. CHECK IF RLS IS ENABLED ON event_tags
-- ============================================
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'event_tags';

-- Expected result: rls_enabled should be TRUE

-- ============================================
-- 2. CHECK IF data_summary VIEW EXISTS
-- ============================================
SELECT 
  schemaname,
  viewname,
  viewowner
FROM pg_views 
WHERE schemaname = 'public' 
  AND viewname = 'data_summary';

-- Expected result: Should return 0 rows (view should be dropped)

-- ============================================
-- 3. VERIFY event_tags POLICIES EXIST
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'event_tags'
ORDER BY policyname;

-- Expected result: Should show 3 policies:
-- - "Organizers can manage their event tags"
-- - "Public can read event tags"
-- - "Venue admins can manage tags for their venue events"

-- ============================================
-- 4. SUMMARY CHECK
-- ============================================
SELECT 
  'event_tags RLS enabled' as check_item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename = 'event_tags' 
        AND rowsecurity = true
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status
UNION ALL
SELECT 
  'data_summary view dropped' as check_item,
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_views 
      WHERE schemaname = 'public' 
        AND viewname = 'data_summary'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status
UNION ALL
SELECT 
  'event_tags policies exist' as check_item,
  CASE 
    WHEN (
      SELECT COUNT(*) FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename = 'event_tags'
    ) >= 3 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status;

