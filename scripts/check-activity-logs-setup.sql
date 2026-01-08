-- Check if activity_logs table exists and has data
-- Run this in Supabase SQL Editor to verify setup

-- ============================================
-- 1. CHECK IF TABLE EXISTS
-- ============================================
SELECT 
  'Table Check' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'activity_logs'
    ) THEN '✅ Table exists'
    ELSE '❌ Table does NOT exist - Run migration 128!'
  END as status;

-- ============================================
-- 2. CHECK IF FUNCTION EXISTS
-- ============================================
SELECT 
  'Function Check' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = 'log_activity'
    ) THEN '✅ Function exists'
    ELSE '❌ Function does NOT exist - Run migration 128!'
  END as status;

-- ============================================
-- 3. CHECK ROW COUNT
-- ============================================
SELECT 
  'Data Check' as check_type,
  COUNT(*) as total_logs,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT entity_type) as entity_types,
  MIN(created_at) as earliest_log,
  MAX(created_at) as latest_log
FROM public.activity_logs;

-- ============================================
-- 4. CHECK RECENT ACTIVITY (LAST 24 HOURS)
-- ============================================
SELECT 
  'Recent Activity' as check_type,
  action_type,
  entity_type,
  COUNT(*) as count
FROM public.activity_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY action_type, entity_type
ORDER BY count DESC;

-- ============================================
-- 5. CHECK MIGRATION STATUS
-- ============================================
SELECT 
  'Migration Status' as check_type,
  version,
  name,
  inserted_at
FROM supabase_migrations.schema_migrations
WHERE version = 128
ORDER BY version;





