-- Sample Test Data for CrowdStack
-- This creates realistic test data showing the full event lifecycle

-- Note: All emails are set to @sixa.group domain

-- ============================================
-- SAMPLE DATA INSERTION
-- ============================================

DO $$
DECLARE
  -- Entity IDs (using fixed UUIDs for predictability)
  v_venue_1 UUID := 'a1111111-1111-1111-1111-111111111111'::UUID;
  v_venue_2 UUID := 'a2222222-2222-2222-2222-222222222222'::UUID;
  v_org_entity_1 UUID := 'b1111111-1111-1111-1111-111111111111'::UUID;
  v_org_entity_2 UUID := 'b2222222-2222-2222-2222-222222222222'::UUID;
  v_promoter_entity_1 UUID := 'c1111111-1111-1111-1111-111111111111'::UUID;
  v_promoter_entity_2 UUID := 'c2222222-2222-2222-2222-222222222222'::UUID;
  v_promoter_entity_3 UUID := 'c3333333-3333-3333-3333-333333333333'::UUID;
  
  -- Events
  v_event_past_1 UUID := 'd1111111-1111-1111-1111-111111111111'::UUID;
  v_event_past_2 UUID := 'd2222222-2222-2222-2222-222222222222'::UUID;
  v_event_upcoming_1 UUID := 'd3333333-3333-3333-3333-333333333333'::UUID;
  v_event_upcoming_2 UUID := 'd4444444-4444-4444-4444-444444444444'::UUID;
  v_event_pending UUID := 'd5555555-5555-5555-5555-555555555555'::UUID;
  
  -- Attendees
  v_attendee_1 UUID := 'e1111111-1111-1111-1111-111111111111'::UUID;
  v_attendee_2 UUID := 'e2222222-2222-2222-2222-222222222222'::UUID;
  v_attendee_3 UUID := 'e3333333-3333-3333-3333-333333333333'::UUID;
  v_attendee_4 UUID := 'e4444444-4444-4444-4444-444444444444'::UUID;
  v_attendee_5 UUID := 'e5555555-5555-5555-5555-555555555555'::UUID;
  v_attendee_6 UUID := 'e6666666-6666-6666-6666-666666666666'::UUID;
  v_attendee_7 UUID := 'e7777777-7777-7777-7777-777777777777'::UUID;
  v_attendee_8 UUID := 'e8888888-8888-8888-8888-888888888888'::UUID;
  v_attendee_9 UUID := 'e9999999-9999-9999-9999-999999999999'::UUID;
  v_attendee_10 UUID := 'eaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID;

  -- For check-in lookups
  v_reg_rec RECORD;

BEGIN
  -- ============================================
  -- VENUES
  -- ============================================
  
  INSERT INTO public.venues (id, name, email, phone, address, city, state, country)
  VALUES
    (v_venue_1, 'The Grand Ballroom', 'grandballroom@sixa.group', '+1-555-0101', '123 Main Street', 'New York', 'NY', 'US'),
    (v_venue_2, 'Skyline Rooftop Bar', 'skylinerooftop@sixa.group', '+1-555-0102', '456 High Street', 'Los Angeles', 'CA', 'US')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name;

  -- ============================================
  -- ORGANIZERS
  -- ============================================
  
  INSERT INTO public.organizers (id, name, email, phone, company_name)
  VALUES
    (v_org_entity_1, 'Elite Events Co', 'elite.events@sixa.group', '+1-555-0201', 'Elite Events LLC'),
    (v_org_entity_2, 'Party Planners Inc', 'party.planners@sixa.group', '+1-555-0202', 'Party Planners Inc')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name;

  -- ============================================
  -- PROMOTERS
  -- ============================================
  
  INSERT INTO public.promoters (id, name, email, phone)
  VALUES
    (v_promoter_entity_1, 'DJ Marcus', 'dj.marcus@sixa.group', '+1-555-0301'),
    (v_promoter_entity_2, 'Sarah Social', 'sarah.social@sixa.group', '+1-555-0302'),
    (v_promoter_entity_3, 'Club King Mike', 'clubking.mike@sixa.group', '+1-555-0303')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name;

  -- ============================================
  -- VENUE-ORGANIZER PARTNERSHIPS (Pre-approved)
  -- ============================================
  
  -- Elite Events is pre-approved at The Grand Ballroom
  INSERT INTO public.venue_organizer_partnerships (venue_id, organizer_id, auto_approve)
  VALUES (v_venue_1, v_org_entity_1, true)
  ON CONFLICT (venue_id, organizer_id) DO NOTHING;

  -- ============================================
  -- EVENTS - PAST (Completed)
  -- ============================================
  
  -- Past Event 1: New Year's Eve Gala (2 months ago)
  INSERT INTO public.events (
    id, slug, name, description, venue_id, organizer_id,
    start_time, end_time, capacity, status,
    venue_approval_status, venue_approval_at,
    promoter_access_type
  ) VALUES (
    v_event_past_1,
    'nye-gala-2024',
    'New Year''s Eve Gala 2024',
    'An unforgettable night of celebration with live music, champagne, and fireworks view from The Grand Ballroom.',
    v_venue_1,
    v_org_entity_1,
    NOW() - INTERVAL '2 months',
    NOW() - INTERVAL '2 months' + INTERVAL '6 hours',
    400,
    'ended',
    'approved',
    NOW() - INTERVAL '3 months',
    'invite_only'
  ) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    status = EXCLUDED.status;

  -- Past Event 2: Summer Rooftop Party (1 month ago)
  INSERT INTO public.events (
    id, slug, name, description, venue_id, organizer_id,
    start_time, end_time, capacity, status,
    venue_approval_status, venue_approval_at,
    promoter_access_type
  ) VALUES (
    v_event_past_2,
    'summer-rooftop-party',
    'Summer Rooftop Party',
    'Sunset vibes, craft cocktails, and the best DJs in town at Skyline Rooftop.',
    v_venue_2,
    v_org_entity_2,
    NOW() - INTERVAL '1 month',
    NOW() - INTERVAL '1 month' + INTERVAL '5 hours',
    150,
    'ended',
    'approved',
    NOW() - INTERVAL '2 months',
    'public'
  ) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    status = EXCLUDED.status;

  -- ============================================
  -- EVENTS - UPCOMING (Published)
  -- ============================================
  
  -- Upcoming Event 1: Valentine's Night (2 weeks from now)
  INSERT INTO public.events (
    id, slug, name, description, venue_id, organizer_id,
    start_time, end_time, capacity, status,
    venue_approval_status, venue_approval_at,
    promoter_access_type
  ) VALUES (
    v_event_upcoming_1,
    'valentines-night-2025',
    'Valentine''s Night 2025',
    'A romantic evening with live jazz, candlelit dinner, and dancing under the stars.',
    v_venue_1,
    v_org_entity_1,
    NOW() + INTERVAL '2 weeks',
    NOW() + INTERVAL '2 weeks' + INTERVAL '5 hours',
    300,
    'published',
    'approved',
    NOW() - INTERVAL '1 week',
    'invite_only'
  ) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    status = EXCLUDED.status;

  -- Upcoming Event 2: Spring Break Bash (1 month from now)
  INSERT INTO public.events (
    id, slug, name, description, venue_id, organizer_id,
    start_time, end_time, capacity, status,
    venue_approval_status, venue_approval_at,
    promoter_access_type
  ) VALUES (
    v_event_upcoming_2,
    'spring-break-bash',
    'Spring Break Bash',
    'The ultimate spring break party with pool access, live DJs, and all-day drinks.',
    v_venue_2,
    v_org_entity_1,
    NOW() + INTERVAL '1 month',
    NOW() + INTERVAL '1 month' + INTERVAL '8 hours',
    180,
    'published',
    'approved',
    NOW() - INTERVAL '2 days',
    'public'
  ) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    status = EXCLUDED.status;

  -- ============================================
  -- EVENT - PENDING APPROVAL (Draft)
  -- ============================================
  
  INSERT INTO public.events (
    id, slug, name, description, venue_id, organizer_id,
    start_time, end_time, capacity, status,
    venue_approval_status,
    promoter_access_type
  ) VALUES (
    v_event_pending,
    'tech-meetup-april',
    'Tech Industry Meetup',
    'Network with the best minds in tech over drinks and appetizers.',
    v_venue_2,
    v_org_entity_2,
    NOW() + INTERVAL '6 weeks',
    NOW() + INTERVAL '6 weeks' + INTERVAL '4 hours',
    100,
    'draft',
    'pending',
    'public'
  ) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    venue_approval_status = EXCLUDED.venue_approval_status;

  -- ============================================
  -- EVENT PROMOTERS (Linking promoters to events)
  -- ============================================
  
  -- Past Event 1: DJ Marcus and Sarah Social
  INSERT INTO public.event_promoters (event_id, promoter_id, commission_type, commission_config)
  VALUES
    (v_event_past_1, v_promoter_entity_1, 'flat_per_head', '{"amount_per_head": 5}'::jsonb),
    (v_event_past_1, v_promoter_entity_2, 'flat_per_head', '{"amount_per_head": 5}'::jsonb)
  ON CONFLICT (event_id, promoter_id) DO NOTHING;

  -- Past Event 2: All three promoters
  INSERT INTO public.event_promoters (event_id, promoter_id, commission_type, commission_config)
  VALUES
    (v_event_past_2, v_promoter_entity_1, 'flat_per_head', '{"amount_per_head": 3}'::jsonb),
    (v_event_past_2, v_promoter_entity_2, 'flat_per_head', '{"amount_per_head": 3}'::jsonb),
    (v_event_past_2, v_promoter_entity_3, 'flat_per_head', '{"amount_per_head": 4}'::jsonb)
  ON CONFLICT (event_id, promoter_id) DO NOTHING;

  -- Upcoming Event 1: DJ Marcus and Club King Mike
  INSERT INTO public.event_promoters (event_id, promoter_id, commission_type, commission_config)
  VALUES
    (v_event_upcoming_1, v_promoter_entity_1, 'flat_per_head', '{"amount_per_head": 7}'::jsonb),
    (v_event_upcoming_1, v_promoter_entity_3, 'flat_per_head', '{"amount_per_head": 6}'::jsonb)
  ON CONFLICT (event_id, promoter_id) DO NOTHING;

  -- Upcoming Event 2: Sarah Social
  INSERT INTO public.event_promoters (event_id, promoter_id, commission_type, commission_config)
  VALUES
    (v_event_upcoming_2, v_promoter_entity_2, 'flat_per_head', '{"amount_per_head": 4}'::jsonb)
  ON CONFLICT (event_id, promoter_id) DO NOTHING;

  -- ============================================
  -- ATTENDEES
  -- ============================================
  
  INSERT INTO public.attendees (id, name, email, phone)
  VALUES
    (v_attendee_1, 'Alice Johnson', 'alice.johnson@sixa.group', '+1-555-1001'),
    (v_attendee_2, 'Bob Smith', 'bob.smith@sixa.group', '+1-555-1002'),
    (v_attendee_3, 'Carol Davis', 'carol.davis@sixa.group', '+1-555-1003'),
    (v_attendee_4, 'David Wilson', 'david.wilson@sixa.group', '+1-555-1004'),
    (v_attendee_5, 'Emma Brown', 'emma.brown@sixa.group', '+1-555-1005'),
    (v_attendee_6, 'Frank Miller', 'frank.miller@sixa.group', '+1-555-1006'),
    (v_attendee_7, 'Grace Lee', 'grace.lee@sixa.group', '+1-555-1007'),
    (v_attendee_8, 'Henry Taylor', 'henry.taylor@sixa.group', '+1-555-1008'),
    (v_attendee_9, 'Ivy Chen', 'ivy.chen@sixa.group', '+1-555-1009'),
    (v_attendee_10, 'Jack Anderson', 'jack.anderson@sixa.group', '+1-555-1010')
  ON CONFLICT (phone) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name;

  -- ============================================
  -- REGISTRATIONS (Attendees registered via promoters)
  -- Note: Using referral_promoter_id (correct column name)
  -- ============================================
  
  -- Past Event 1: NYE Gala
  INSERT INTO public.registrations (attendee_id, event_id, referral_promoter_id, registered_at)
  VALUES
    (v_attendee_1, v_event_past_1, v_promoter_entity_1, NOW() - INTERVAL '3 months'),
    (v_attendee_2, v_event_past_1, v_promoter_entity_1, NOW() - INTERVAL '3 months' + INTERVAL '1 day'),
    (v_attendee_3, v_event_past_1, v_promoter_entity_2, NOW() - INTERVAL '2 months' - INTERVAL '10 days'),
    (v_attendee_4, v_event_past_1, v_promoter_entity_2, NOW() - INTERVAL '2 months' - INTERVAL '5 days'),
    (v_attendee_5, v_event_past_1, v_promoter_entity_1, NOW() - INTERVAL '2 months' - INTERVAL '3 days')
  ON CONFLICT (attendee_id, event_id) DO NOTHING;

  -- Past Event 2: Summer Rooftop
  INSERT INTO public.registrations (attendee_id, event_id, referral_promoter_id, registered_at)
  VALUES
    (v_attendee_3, v_event_past_2, v_promoter_entity_1, NOW() - INTERVAL '2 months'),
    (v_attendee_4, v_event_past_2, v_promoter_entity_2, NOW() - INTERVAL '6 weeks'),
    (v_attendee_5, v_event_past_2, v_promoter_entity_3, NOW() - INTERVAL '5 weeks'),
    (v_attendee_6, v_event_past_2, v_promoter_entity_3, NOW() - INTERVAL '1 month' - INTERVAL '3 days'),
    (v_attendee_7, v_event_past_2, v_promoter_entity_2, NOW() - INTERVAL '1 month' - INTERVAL '2 days')
  ON CONFLICT (attendee_id, event_id) DO NOTHING;

  -- Upcoming Event 1: Valentine's Night
  INSERT INTO public.registrations (attendee_id, event_id, referral_promoter_id, registered_at)
  VALUES
    (v_attendee_1, v_event_upcoming_1, v_promoter_entity_1, NOW() - INTERVAL '5 days'),
    (v_attendee_2, v_event_upcoming_1, v_promoter_entity_3, NOW() - INTERVAL '3 days'),
    (v_attendee_8, v_event_upcoming_1, v_promoter_entity_1, NOW() - INTERVAL '2 days'),
    (v_attendee_9, v_event_upcoming_1, v_promoter_entity_3, NOW() - INTERVAL '1 day'),
    (v_attendee_10, v_event_upcoming_1, v_promoter_entity_1, NOW())
  ON CONFLICT (attendee_id, event_id) DO NOTHING;

  -- Upcoming Event 2: Spring Break
  INSERT INTO public.registrations (attendee_id, event_id, referral_promoter_id, registered_at)
  VALUES
    (v_attendee_5, v_event_upcoming_2, v_promoter_entity_2, NOW() - INTERVAL '1 day'),
    (v_attendee_6, v_event_upcoming_2, v_promoter_entity_2, NOW() - INTERVAL '12 hours'),
    (v_attendee_7, v_event_upcoming_2, v_promoter_entity_2, NOW() - INTERVAL '2 hours')
  ON CONFLICT (attendee_id, event_id) DO NOTHING;

  -- ============================================
  -- CHECK-INS (For past events)
  -- Note: checkins reference registration_id, not event_id/attendee_id
  -- ============================================
  
  -- Past Event 1: All 5 attendees checked in
  FOR v_reg_rec IN 
    SELECT id, attendee_id FROM public.registrations 
    WHERE event_id = v_event_past_1
  LOOP
    INSERT INTO public.checkins (registration_id, checked_in_at)
    VALUES (v_reg_rec.id, NOW() - INTERVAL '2 months' + INTERVAL '1 hour' + (random() * INTERVAL '2 hours'))
    ON CONFLICT (registration_id) DO NOTHING;
  END LOOP;

  -- Past Event 2: 4 out of 5 checked in (skip attendee_7 for no-show)
  FOR v_reg_rec IN 
    SELECT id, attendee_id FROM public.registrations 
    WHERE event_id = v_event_past_2 AND attendee_id != v_attendee_7
  LOOP
    INSERT INTO public.checkins (registration_id, checked_in_at)
    VALUES (v_reg_rec.id, NOW() - INTERVAL '1 month' + INTERVAL '30 minutes' + (random() * INTERVAL '90 minutes'))
    ON CONFLICT (registration_id) DO NOTHING;
  END LOOP;
  -- Note: v_attendee_7 registered but didn't check in (no-show)

  -- ============================================
  -- SUMMARY
  -- ============================================
  
  RAISE NOTICE 'Sample data created successfully!';
  RAISE NOTICE 'Venues: The Grand Ballroom, Skyline Rooftop Bar';
  RAISE NOTICE 'Organizers: Elite Events Co, Party Planners Inc';
  RAISE NOTICE 'Promoters: DJ Marcus, Sarah Social, Club King Mike';
  RAISE NOTICE 'Events: 2 past (ended), 2 upcoming (published), 1 pending approval';
  RAISE NOTICE 'Attendees: 10 test attendees with registrations and check-ins';

END $$;

-- ============================================
-- UPDATE EXISTING EMAILS TO @sixa.group
-- ============================================

-- Update any existing venues
UPDATE public.venues 
SET email = SPLIT_PART(email, '@', 1) || '@sixa.group'
WHERE email IS NOT NULL AND email NOT LIKE '%@sixa.group';

-- Update any existing organizers
UPDATE public.organizers 
SET email = SPLIT_PART(email, '@', 1) || '@sixa.group'
WHERE email IS NOT NULL AND email NOT LIKE '%@sixa.group';

-- Update any existing promoters
UPDATE public.promoters 
SET email = SPLIT_PART(email, '@', 1) || '@sixa.group'
WHERE email IS NOT NULL AND email NOT LIKE '%@sixa.group';

-- Update any existing attendees
UPDATE public.attendees 
SET email = SPLIT_PART(email, '@', 1) || '@sixa.group'
WHERE email IS NOT NULL AND email NOT LIKE '%@sixa.group';
