-- Check which migrations have been applied to the database
-- This queries the supabase_migrations.schema_migrations table

SELECT 
  version,
  name,
  inserted_at
FROM supabase_migrations.schema_migrations
WHERE version >= 120
ORDER BY version;

-- Check if our specific migrations exist
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = 124) THEN '✅ 124 exists'
    ELSE '❌ 124 missing'
  END as migration_124,
  CASE 
    WHEN EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = 125) THEN '✅ 125 exists'
    ELSE '❌ 125 missing'
  END as migration_125,
  CASE 
    WHEN EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = 126) THEN '✅ 126 exists'
    ELSE '❌ 126 missing'
  END as migration_126,
  CASE 
    WHEN EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = 127) THEN '✅ 127 exists'
    ELSE '❌ 127 missing'
  END as migration_127;

-- Check if the trigger exists (from migration 124/127)
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing
FROM information_schema.triggers
WHERE trigger_name LIKE '%promoter%name%'
ORDER BY trigger_name;

-- Check if the function exists
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%promoter%name%'
ORDER BY routine_name;

