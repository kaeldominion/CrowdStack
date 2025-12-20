#!/bin/bash

# Non-interactive script to push migrations to Production Supabase
# Usage: PROJECT_REF=fvrjcyscwibrqpsviblx ./scripts/update-prod-db-auto.sh

set -e

PROJECT_REF="${PROJECT_REF:-fvrjcyscwibrqpsviblx}"

echo "🚀 Pushing migrations to Production Supabase..."
echo "Project Reference: $PROJECT_REF"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI is not installed."
  echo "Install it: https://supabase.com/docs/guides/cli"
  exit 1
fi

# Check if already linked to a different project
if [ -f ".supabase/config.toml" ]; then
  echo "⚠️  Already linked to a project. Unlinking first..."
  supabase unlink || true
fi

# Link to Production Supabase
echo "🔗 Linking to Production Supabase..."
supabase link --project-ref "$PROJECT_REF"

# Push migrations
echo ""
echo "📤 Pushing migrations to Production..."
supabase db push

echo ""
echo "✅ Migrations pushed to Production!"
echo ""
echo "📝 Next steps:"
echo "  1. Verify the migrations in Supabase Dashboard → Database → Migrations"
echo "  2. Create storage buckets (run scripts/setup-prod-storage.sql)"
echo "  3. Configure authentication redirect URLs"
echo ""

