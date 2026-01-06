-- ============================================
-- CHECK MIGRATIONS ON BOTH BETA AND PROD
-- ============================================
-- Run this in BOTH Supabase SQL Editors (Beta and Prod)
-- Copy the results to compare

-- ============================================
-- 1. CHECK MIGRATION RECORDS
-- ============================================
SELECT 
  'Migration Records' as check_type,
  version,
  name,
  inserted_at::text as applied_at
FROM supabase_migrations.schema_migrations
WHERE version IN (124, 125, 126, 127)
ORDER BY version;

-- ============================================
-- 2. CHECK IF TRIGGERS EXIST
-- ============================================
SELECT 
  'Triggers' as check_type,
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation,
  CASE 
    WHEN trigger_name = 'trigger_sync_promoter_name_from_attendee' THEN '✅ Update trigger (migration 124/127)'
    WHEN trigger_name = 'trigger_sync_promoter_name_on_attendee_insert' THEN '✅ Insert trigger (migration 127)'
    ELSE '❓ Unknown trigger'
  END as status
FROM information_schema.triggers
WHERE trigger_name LIKE '%promoter%name%'
ORDER BY trigger_name;

-- ============================================
-- 3. CHECK IF FUNCTIONS EXIST
-- ============================================
SELECT 
  'Functions' as check_type,
  routine_name,
  routine_type,
  CASE 
    WHEN routine_name = 'sync_promoter_name_from_attendee' THEN '✅ Main sync function (migration 124/127)'
    WHEN routine_name = 'sync_promoter_name_on_attendee_insert' THEN '✅ Insert sync function (migration 127)'
    ELSE '❓ Unknown function'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%promoter%name%'
ORDER BY routine_name;

-- ============================================
-- 4. SUMMARY STATUS
-- ============================================
SELECT 
  'SUMMARY' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = 'sync_promoter_name_from_attendee'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.triggers 
      WHERE trigger_name = 'trigger_sync_promoter_name_from_attendee'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.triggers 
      WHERE trigger_name = 'trigger_sync_promoter_name_on_attendee_insert'
    ) THEN '✅ All objects exist - Migrations 124-127 appear to have run'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = 'sync_promoter_name_from_attendee'
    ) THEN '⚠️  Partial - Some objects missing'
    ELSE '❌ No objects found - Migrations may not have run'
  END as overall_status,
  (SELECT COUNT(*) FROM supabase_migrations.schema_migrations WHERE version IN (124, 125, 126, 127)) as migrations_recorded,
  (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_name LIKE '%promoter%name%') as triggers_found,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE '%promoter%name%') as functions_found;

