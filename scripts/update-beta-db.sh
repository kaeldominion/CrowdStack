#!/bin/bash

# Script to update Beta Supabase database with latest migrations
# This will:
# 1. Link to Beta project (if not already linked)
# 2. Push all migrations
# 3. Make spencertarring@gmail.com a superadmin

set -e

echo "🚀 Updating Beta Supabase database..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI not found. Please install it first:"
  echo "   brew install supabase/tap/supabase"
  exit 1
fi

# Check if already linked
if [ -f ".supabase/config.toml" ]; then
  echo "✓ Project already linked"
else
  echo "📎 Linking to Beta Supabase project..."
  echo "   You'll need your Beta project reference ID from Supabase dashboard"
  echo "   (found in project settings or URL: https://supabase.com/dashboard/project/YOUR_PROJECT_REF)"
  read -p "Enter your Beta Supabase project reference: " PROJECT_REF
  
  if [ -z "$PROJECT_REF" ]; then
    echo "❌ Project reference is required"
    exit 1
  fi
  
  supabase link --project-ref "$PROJECT_REF"
fi

# Push migrations
echo "📦 Pushing migrations to Beta database..."
supabase db push

# Make superadmin
echo "👑 Making spencertarring@gmail.com a superadmin..."
supabase db execute --file scripts/make-superadmin.sql

echo "✅ Beta database updated successfully!"
echo ""
echo "Next steps:"
echo "  - Verify the superadmin role was assigned in Supabase dashboard"
echo "  - Test admin access in the app"

