-- Verify that migrations 124-127 actually ran by checking for the objects they create

-- ============================================
-- CHECK MIGRATION 124/127: Trigger and Function
-- ============================================
SELECT 
  'Migration 124/127 Check' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = 'sync_promoter_name_from_attendee'
    ) THEN '✅ Function exists'
    ELSE '❌ Function MISSING - migration may not have run'
  END as function_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers 
      WHERE trigger_name = 'trigger_sync_promoter_name_from_attendee'
    ) THEN '✅ Update trigger exists'
    ELSE '❌ Update trigger MISSING - migration may not have run'
  END as update_trigger_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers 
      WHERE trigger_name = 'trigger_sync_promoter_name_on_attendee_insert'
    ) THEN '✅ Insert trigger exists'
    ELSE '❌ Insert trigger MISSING - migration 127 may not have run'
  END as insert_trigger_status;

-- ============================================
-- CHECK MIGRATION RECORDS
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
-- DETAILED OBJECT CHECK
-- ============================================
-- Show the actual trigger and function details
SELECT 
  'trigger_sync_promoter_name_from_attendee' as object_name,
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'trigger_sync_promoter_name_from_attendee'

UNION ALL

SELECT 
  'trigger_sync_promoter_name_on_attendee_insert' as object_name,
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'trigger_sync_promoter_name_on_attendee_insert'

UNION ALL

SELECT 
  'sync_promoter_name_from_attendee' as object_name,
  routine_name as trigger_name,
  routine_schema as event_object_table,
  routine_type as action_timing,
  '' as event_manipulation
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'sync_promoter_name_from_attendee';

