#!/bin/bash

# Script to push migrations to Production Supabase
# Usage: ./scripts/update-prod-db.sh

set -e

echo "🚀 Pushing migrations to Production Supabase..."
echo ""
echo "⚠️  WARNING: This will modify your PRODUCTION database!"
echo "⚠️  Make sure you've tested all migrations in Beta first!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ Aborted."
  exit 1
fi

echo ""
echo "📋 Steps:"
echo "1. Link to Production Supabase project"
echo "2. Push all migrations"
echo "3. Verify migration status"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI is not installed."
  echo "Install it: https://supabase.com/docs/guides/cli"
  exit 1
fi

# Link to Production Supabase
echo "🔗 Linking to Production Supabase..."
echo "You'll need to:"
echo "  1. Go to your Production Supabase project dashboard"
echo "  2. Go to Settings → General → Reference ID"
echo "  3. Copy the Reference ID"
echo ""
read -p "Enter Production Supabase Project Reference ID: " project_ref

if [ -z "$project_ref" ]; then
  echo "❌ Project Reference ID is required."
  exit 1
fi

# Link to the project
supabase link --project-ref "$project_ref"

# Push migrations
echo ""
echo "📤 Pushing migrations to Production..."
supabase db push

echo ""
echo "✅ Migrations pushed to Production!"
echo ""
echo "📝 Next steps:"
echo "  1. Verify the migrations in Supabase Dashboard → Database → Migrations"
echo "  2. Test your production environment"
echo "  3. Monitor for any issues"
echo ""

