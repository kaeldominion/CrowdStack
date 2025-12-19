-- =====================================================
-- LIVE TEST EVENT - For testing door app and live features
-- This event runs from yesterday to 1 year from now
-- =====================================================

-- Use fixed UUIDs for easy reference (hex chars only: 0-9, a-f)
-- Live Event: e1111111-1111-1111-1111-111111111111
-- Organizer: 07777777-7777-7777-7777-777777777777
-- Venue: Use existing "The Grand Venue" (from migration 019)

-- Create a dedicated test organizer for this live event
INSERT INTO public.organizers (id, name, email, phone, created_by)
VALUES (
  '07777777-7777-7777-7777-777777777777',
  'Live Event Productions',
  'live@testorganizer.com',
  '+1-555-5483-001',
  (SELECT id FROM auth.users LIMIT 1) -- Use first available user
)
ON CONFLICT (id) DO NOTHING;

-- Create the LIVE TEST EVENT
-- First check if venue exists, if not use NULL
INSERT INTO public.events (
  id,
  name,
  slug,
  description,
  venue_id,
  organizer_id,
  start_time,
  end_time,
  status,
  capacity,
  venue_approval_status
)
SELECT
  'e1111111-1111-1111-1111-111111111111',
  '🔴 LIVE TEST EVENT - Door & Scanner Testing',
  'live-test-event',
  'This is a permanent test event for testing the door scanner, check-ins, and live metrics. It runs 24/7 for development purposes.',
  v.id,
  '07777777-7777-7777-7777-777777777777',
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '1 year',
  'published',
  200,
  'approved'
FROM (SELECT id FROM public.venues LIMIT 1) v
ON CONFLICT (id) DO UPDATE SET
  start_time = NOW() - INTERVAL '1 day',
  end_time = NOW() + INTERVAL '1 year',
  status = 'published';

-- Create test promoters for this event
INSERT INTO public.promoters (id, name, email, user_id)
VALUES 
  ('b8888888-8888-8888-8888-888888888881', 'Luna Skywalker', 'luna@livepromoters.com', NULL),
  ('b8888888-8888-8888-8888-888888888882', 'Rex Thunder', 'rex@livepromoters.com', NULL),
  ('b8888888-8888-8888-8888-888888888883', 'Maya Nightshade', 'maya@livepromoters.com', NULL)
ON CONFLICT (id) DO NOTHING;

-- Assign promoters to the live event
INSERT INTO public.event_promoters (event_id, promoter_id, commission_type, commission_config)
VALUES 
  ('e1111111-1111-1111-1111-111111111111', 'b8888888-8888-8888-8888-888888888881', 'flat_per_head', '{"amount_per_head": 5}'::jsonb),
  ('e1111111-1111-1111-1111-111111111111', 'b8888888-8888-8888-8888-888888888882', 'flat_per_head', '{"amount_per_head": 5}'::jsonb),
  ('e1111111-1111-1111-1111-111111111111', 'b8888888-8888-8888-8888-888888888883', 'flat_per_head', '{"amount_per_head": 5}'::jsonb)
ON CONFLICT (event_id, promoter_id) DO NOTHING;

-- Create test attendees
INSERT INTO public.attendees (id, name, email, phone)
VALUES 
  ('a9999999-9999-9999-9999-999999999991', 'Alex Johnson', 'alex.j@testemail.com', '+1-555-0101'),
  ('a9999999-9999-9999-9999-999999999992', 'Jamie Smith', 'jamie.s@testemail.com', '+1-555-0102'),
  ('a9999999-9999-9999-9999-999999999993', 'Casey Brown', 'casey.b@testemail.com', '+1-555-0103'),
  ('a9999999-9999-9999-9999-999999999994', 'Morgan Davis', 'morgan.d@testemail.com', '+1-555-0104'),
  ('a9999999-9999-9999-9999-999999999995', 'Taylor Wilson', 'taylor.w@testemail.com', '+1-555-0105')
ON CONFLICT (id) DO NOTHING;

-- Create registrations (some with promoter referrals)
INSERT INTO public.registrations (id, event_id, attendee_id, referral_promoter_id, checked_in)
VALUES 
  -- Alex - checked in via Luna (checked in 2 hours ago)
  ('a0000001-0001-0001-0001-000000000001', 'e1111111-1111-1111-1111-111111111111', 'a9999999-9999-9999-9999-999999999991', 'b8888888-8888-8888-8888-888888888881', TRUE),
  -- Jamie - checked in via Rex (checked in 1 hour ago)
  ('a0000001-0001-0001-0001-000000000002', 'e1111111-1111-1111-1111-111111111111', 'a9999999-9999-9999-9999-999999999992', 'b8888888-8888-8888-8888-888888888882', TRUE),
  -- Casey - NOT checked in yet (registered via Maya)
  ('a0000001-0001-0001-0001-000000000003', 'e1111111-1111-1111-1111-111111111111', 'a9999999-9999-9999-9999-999999999993', 'b8888888-8888-8888-8888-888888888883', FALSE),
  -- Morgan - NOT checked in yet (no promoter referral - organic)
  ('a0000001-0001-0001-0001-000000000004', 'e1111111-1111-1111-1111-111111111111', 'a9999999-9999-9999-9999-999999999994', NULL, FALSE),
  -- Taylor - checked in recently (no promoter referral - organic)
  ('a0000001-0001-0001-0001-000000000005', 'e1111111-1111-1111-1111-111111111111', 'a9999999-9999-9999-9999-999999999995', NULL, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Create check-in records for those who checked in
INSERT INTO public.checkins (id, registration_id, checked_in_at)
VALUES 
  -- Alex checked in 2 hours ago
  ('c0000001-0001-0001-0001-000000000001', 'a0000001-0001-0001-0001-000000000001', NOW() - INTERVAL '2 hours'),
  -- Jamie checked in 1 hour ago
  ('c0000001-0001-0001-0001-000000000002', 'a0000001-0001-0001-0001-000000000002', NOW() - INTERVAL '1 hour'),
  -- Taylor checked in 15 minutes ago
  ('c0000001-0001-0001-0001-000000000003', 'a0000001-0001-0001-0001-000000000005', NOW() - INTERVAL '15 minutes')
ON CONFLICT (id) DO NOTHING;

-- Summary:
-- Event: 🔴 LIVE TEST EVENT - Door & Scanner Testing
-- Event ID: e1111111-1111-1111-1111-111111111111
-- Organizer: Live Event Productions (07777777-7777-7777-7777-777777777777)
-- Promoters: Luna Skywalker, Rex Thunder, Maya Nightshade
-- Attendees: 5 total
--   - 3 checked in (Alex, Jamie, Taylor)
--   - 2 not checked in (Casey, Morgan)
-- Door Scanner URL: /door/e1111111-1111-1111-1111-111111111111
