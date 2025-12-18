#!/bin/bash

# Script to make spencertarring@gmail.com a superadmin
# This script uses the Supabase CLI or direct SQL connection

EMAIL="spencertarring@gmail.com"
SQL_FILE="$(dirname "$0")/make-superadmin.sql"

echo "Making $EMAIL a superadmin..."

# Check if Supabase CLI is available
if command -v supabase &> /dev/null; then
  echo "Using Supabase CLI..."
  supabase db execute --file "$SQL_FILE"
elif [ -n "$DATABASE_URL" ]; then
  echo "Using DATABASE_URL..."
  psql "$DATABASE_URL" -f "$SQL_FILE"
else
  echo "Error: Neither Supabase CLI nor DATABASE_URL found."
  echo "Please run the SQL script manually in your Supabase SQL Editor:"
  echo "  $SQL_FILE"
  exit 1
fi

echo "Done!"

