-- Migration script to move existing message_logs data to email_send_logs
-- This preserves historical email data while consolidating into the unified logging system
-- 
-- Usage: Run this script in your Supabase SQL editor or via psql
-- 
-- Note: This script does NOT delete message_logs data - it only copies it
-- You can delete message_logs entries after verifying the migration

-- ============================================
-- 1. MIGRATE message_logs TO email_send_logs
-- ============================================

INSERT INTO public.email_send_logs (
  recipient,
  recipient_user_id,
  subject,
  email_type,
  template_slug,
  status,
  sent_at,
  error_message,
  metadata,
  created_at
)
SELECT 
  ml.recipient,
  -- Try to find user_id from attendees or auth.users by email
  COALESCE(
    (SELECT id FROM auth.users WHERE email = ml.recipient LIMIT 1),
    (SELECT id FROM public.attendees WHERE email = ml.recipient LIMIT 1),
    NULL
  ) as recipient_user_id,
  ml.subject,
  -- Determine email_type based on subject patterns
  CASE 
    WHEN ml.subject ILIKE '%magic link%' OR ml.subject ILIKE '%verification%' OR ml.subject ILIKE '%sign in%' THEN 'magic_link'
    WHEN ml.subject ILIKE '%contact%' OR ml.subject ILIKE '%demo%' OR ml.subject ILIKE '%request%' THEN 'contact_form'
    WHEN ml.subject ILIKE '%photo%' OR ml.subject ILIKE '%gallery%' THEN 'template' -- Likely template-based
    ELSE 'direct'
  END as email_type,
  -- Use email_type as template_slug for non-template emails
  CASE 
    WHEN ml.subject ILIKE '%magic link%' OR ml.subject ILIKE '%verification%' OR ml.subject ILIKE '%sign in%' THEN 'magic_link'
    WHEN ml.subject ILIKE '%contact%' OR ml.subject ILIKE '%demo%' OR ml.subject ILIKE '%request%' THEN 'contact_form'
    ELSE 'direct'
  END as template_slug,
  ml.status,
  ml.sent_at,
  ml.error_message,
  -- Store original message_logs metadata
  jsonb_build_object(
    'migrated_from', 'message_logs',
    'original_id', ml.id,
    'original_created_at', ml.created_at
  ) as metadata,
  ml.created_at
FROM public.message_logs ml
WHERE NOT EXISTS (
  -- Avoid duplicates: check if email already exists in email_send_logs
  SELECT 1 
  FROM public.email_send_logs esl 
  WHERE esl.recipient = ml.recipient 
    AND esl.subject = ml.subject 
    AND esl.created_at = ml.created_at
)
ORDER BY ml.created_at ASC;

-- ============================================
-- 2. VERIFICATION QUERIES
-- ============================================

-- Count migrated records
SELECT 
  'message_logs' as source_table,
  COUNT(*) as total_records
FROM public.message_logs
UNION ALL
SELECT 
  'email_send_logs (migrated)' as source_table,
  COUNT(*) as total_records
FROM public.email_send_logs
WHERE metadata->>'migrated_from' = 'message_logs';

-- Show sample of migrated records
SELECT 
  recipient,
  subject,
  email_type,
  status,
  created_at
FROM public.email_send_logs
WHERE metadata->>'migrated_from' = 'message_logs'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- 3. OPTIONAL: CLEANUP (RUN AFTER VERIFICATION)
-- ============================================

-- Uncomment the following to delete message_logs entries after migration
-- WARNING: Only run this after verifying the migration was successful!
-- 
-- DELETE FROM public.message_logs
-- WHERE id IN (
--   SELECT (metadata->>'original_id')::uuid
--   FROM public.email_send_logs
--   WHERE metadata->>'migrated_from' = 'message_logs'
-- );
