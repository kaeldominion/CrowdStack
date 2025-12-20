#!/bin/bash

# Script to verify production Supabase setup
# Usage: ./scripts/verify-prod-setup.sh

set -e

PROJECT_REF="${PROJECT_REF:-fvrjcyscwibrqpsviblx}"

echo "🔍 Verifying Production Supabase Setup..."
echo "Project Reference: $PROJECT_REF"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI is not installed."
  echo "Install it: https://supabase.com/docs/guides/cli"
  exit 1
fi

# Link to project if not already linked
if [ ! -f ".supabase/config.toml" ]; then
  echo "🔗 Linking to Production Supabase..."
  supabase link --project-ref "$PROJECT_REF" --yes
fi

echo ""
echo "📊 Checking Database Migrations..."
echo ""

# Check migration status
MIGRATION_COUNT=$(supabase db remote list 2>/dev/null | grep -c "migration" || echo "0")

if [ "$MIGRATION_COUNT" -ge "38" ]; then
  echo "✅ Migrations: Expected at least 38, found $MIGRATION_COUNT"
else
  echo "⚠️  Migrations: Found $MIGRATION_COUNT (expected at least 38)"
fi

echo ""
echo "📦 Checking Storage Buckets..."
echo ""

# Check storage buckets via SQL
BUCKET_CHECK=$(supabase db remote exec "
  SELECT COUNT(*) as count 
  FROM storage.buckets 
  WHERE id IN ('avatars', 'organizer-images', 'venue-images', 'event-photos')
" 2>/dev/null | grep -o '[0-9]' | head -1 || echo "0")

if [ "$BUCKET_CHECK" = "4" ]; then
  echo "✅ Storage Buckets: All 4 buckets found"
else
  echo "⚠️  Storage Buckets: Found $BUCKET_CHECK/4 buckets"
  echo "   Run: scripts/setup-prod-storage.sql in Supabase SQL Editor"
fi

echo ""
echo "📝 Manual Verification Required:"
echo ""
echo "1. Authentication Settings:"
echo "   - Go to: https://supabase.com/dashboard/project/$PROJECT_REF"
echo "   - Navigate to: Authentication → URL Configuration"
echo "   - Verify Site URL: https://crowdstack.app"
echo "   - Verify Redirect URLs are configured"
echo ""
echo "2. Vercel Environment Variables:"
echo "   - Go to: Vercel Dashboard → Your Project → Settings → Environment Variables"
echo "   - Verify all 8 production variables are set"
echo "   - See: scripts/setup-vercel-env.md for details"
echo ""
echo "3. Health Check (after deployment):"
echo "   - Visit: https://crowdstack.app/health"
echo "   - Should return success"
echo ""
echo "✅ Automated checks complete!"
echo "📋 See PRODUCTION_SETUP_COMPLETE.md for full verification checklist"

