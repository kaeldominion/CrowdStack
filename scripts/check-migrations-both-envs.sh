#!/bin/bash
# Script to check migration status on both Beta and Prod Supabase
# Usage: ./scripts/check-migrations-both-envs.sh

set -e

echo "🔍 Checking Migration Status on Both Environments"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_migrations() {
  local env_name=$1
  local project_ref=$2
  
  echo "${YELLOW}📊 Checking ${env_name} (Project: ${project_ref})${NC}"
  echo "----------------------------------------"
  
  # Link to the project
  echo "Linking to ${env_name}..."
  supabase link --project-ref "$project_ref" --yes > /dev/null 2>&1 || true
  
  # Check migration list
  echo ""
  echo "Migration Status:"
  supabase migration list 2>&1 | grep -E "12[0-9]|13[0-9]" || echo "  No migrations 120-139 found"
  
  # Check if we can query the database
  echo ""
  echo "Checking database objects..."
  
  # Create a temporary SQL file to check objects
  cat > /tmp/check_objects.sql << 'EOF'
-- Check for triggers
SELECT 
  'Triggers' as object_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) >= 2 THEN '✅ All triggers exist'
    WHEN COUNT(*) = 1 THEN '⚠️  Only 1 trigger found'
    ELSE '❌ No triggers found'
  END as status
FROM information_schema.triggers
WHERE trigger_name LIKE '%promoter%name%'

UNION ALL

-- Check for function
SELECT 
  'Functions' as object_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) >= 1 THEN '✅ Function exists'
    ELSE '❌ Function missing'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%promoter%name%'

UNION ALL

-- Check migration records
SELECT 
  'Migration Records' as object_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ All 4 migrations recorded'
    WHEN COUNT(*) > 0 THEN CONCAT('⚠️  Only ', COUNT(*), ' migrations recorded')
    ELSE '❌ No migrations recorded'
  END as status
FROM supabase_migrations.schema_migrations
WHERE version IN (124, 125, 126, 127);
EOF

  # Try to execute the check (this might fail if not connected)
  if supabase db remote exec < /tmp/check_objects.sql 2>/dev/null; then
    echo "  ✅ Database accessible"
  else
    echo "  ⚠️  Could not query database directly"
    echo "  Run the SQL in Supabase SQL Editor instead"
  fi
  
  echo ""
}

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "${RED}❌ Supabase CLI is not installed.${NC}"
  echo "Install it: https://supabase.com/docs/guides/cli"
  exit 1
fi

echo "This script will check both Beta and Prod Supabase databases."
echo "You'll need the Project Reference IDs for both."
echo ""

# Get Beta project ref
read -p "Enter BETA Supabase Project Reference ID (or press Enter to skip): " beta_ref
if [ -n "$beta_ref" ]; then
  check_migrations "BETA" "$beta_ref"
fi

echo ""
echo ""

# Get Prod project ref
read -p "Enter PROD Supabase Project Reference ID (or press Enter to skip): " prod_ref
if [ -n "$prod_ref" ]; then
  check_migrations "PROD" "$prod_ref"
fi

echo ""
echo "${GREEN}✅ Check complete!${NC}"
echo ""
echo "If you couldn't query the database directly, run this SQL in Supabase SQL Editor:"
echo "  scripts/verify-migrations-ran.sql"

