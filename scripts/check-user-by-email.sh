#!/bin/bash
# Quick script to check a user's setup
# Usage: ./scripts/check-user-by-email.sh "user@example.com"

if [ -z "$1" ]; then
  echo "Usage: $0 <user_email_or_id>"
  echo "Example: $0 user@example.com"
  exit 1
fi

USER_IDENTIFIER="$1"

# Create a temporary SQL file
cat > /tmp/check_user.sql << EOF
-- Check user setup for: $USER_IDENTIFIER
SELECT 
  u.email,
  u.user_metadata->>'name' as auth_name,
  a.name as attendee_name,
  a.surname as attendee_surname,
  p.name as promoter_name,
  split_part(u.email, '@', 1) as email_username,
  CASE 
    WHEN a.name IS NULL THEN '❌ No attendee profile'
    WHEN p.name IS NULL THEN '❌ No promoter profile'
    WHEN p.name = split_part(u.email, '@', 1) THEN '⚠️ Promoter name matches email (needs fix)'
    WHEN p.name = a.name THEN '✅ Names are synced'
    ELSE '⚠️ Names are different'
  END as sync_status,
  p.user_id as promoter_user_id,
  p.created_by as promoter_created_by
FROM auth.users u
LEFT JOIN public.attendees a ON a.user_id = u.id
LEFT JOIN public.promoters p ON (p.user_id = u.id OR p.created_by = u.id)
WHERE u.email = '$USER_IDENTIFIER'
   OR u.id::text = '$USER_IDENTIFIER';
EOF

echo "SQL query created at /tmp/check_user.sql"
echo "Run this in Supabase SQL Editor:"
echo ""
cat /tmp/check_user.sql

