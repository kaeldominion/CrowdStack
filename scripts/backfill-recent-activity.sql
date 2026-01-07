-- Backfill activity logs for recent key events
-- This will create activity logs for registrations, check-ins, and event edits from the last 30 days
-- Run this AFTER migration 128 has been applied

-- ============================================
-- BACKFILL RECENT REGISTRATIONS (last 30 days)
-- ============================================
INSERT INTO public.activity_logs (user_id, action_type, entity_type, entity_id, metadata, created_at)
SELECT 
  a.user_id,
  'registration_create'::text,
  'registration'::text,
  r.id,
  jsonb_build_object(
    'event_id', r.event_id,
    'event_name', e.name,
    'backfilled', true
  ),
  r.registered_at
FROM public.registrations r
INNER JOIN public.attendees a ON a.id = r.attendee_id
INNER JOIN public.events e ON e.id = r.event_id
WHERE r.registered_at >= NOW() - INTERVAL '30 days'
  AND a.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.activity_logs al
    WHERE al.entity_type = 'registration'
      AND al.entity_id = r.id
      AND al.action_type = 'registration_create'
  )
RETURNING id, action_type, entity_id;

-- ============================================
-- BACKFILL RECENT CHECK-INS (last 30 days)
-- ============================================
INSERT INTO public.activity_logs (user_id, action_type, entity_type, entity_id, metadata, created_at)
SELECT 
  a.user_id,
  'checkin'::text,
  'checkin'::text,
  c.id,
  jsonb_build_object(
    'event_id', r.event_id,
    'registration_id', c.registration_id,
    'checked_in_by', c.checked_in_by,
    'backfilled', true
  ),
  c.checked_in_at
FROM public.checkins c
INNER JOIN public.registrations r ON r.id = c.registration_id
INNER JOIN public.attendees a ON a.id = r.attendee_id
INNER JOIN public.events e ON e.id = r.event_id
WHERE c.checked_in_at >= NOW() - INTERVAL '30 days'
  AND c.undo_at IS NULL
  AND a.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.activity_logs al
    WHERE al.entity_type = 'checkin'
      AND al.entity_id = c.id
      AND al.action_type = 'checkin'
  )
RETURNING id, action_type, entity_id;

-- ============================================
-- BACKFILL RECENT EVENT EDITS (last 30 days)
-- ============================================
INSERT INTO public.activity_logs (user_id, action_type, entity_type, entity_id, metadata, created_at)
SELECT 
  ee.edited_by,
  'event_edit'::text,
  'event'::text,
  ee.event_id,
  jsonb_build_object(
    'changes', ee.changes,
    'reason', ee.reason,
    'editor_role', ee.editor_role,
    'backfilled', true
  ),
  ee.created_at
FROM public.event_edits ee
WHERE ee.created_at >= NOW() - INTERVAL '30 days'
  AND NOT EXISTS (
    SELECT 1 FROM public.activity_logs al
    WHERE al.entity_type = 'event'
      AND al.entity_id = ee.event_id
      AND al.action_type = 'event_edit'
      AND al.created_at = ee.created_at
  )
RETURNING id, action_type, entity_id;

-- ============================================
-- SUMMARY
-- ============================================
SELECT 
  'Backfill Summary' as report,
  COUNT(*) as total_backfilled,
  COUNT(DISTINCT action_type) as action_types,
  COUNT(DISTINCT entity_type) as entity_types
FROM public.activity_logs
WHERE metadata->>'backfilled' = 'true';




