-- Staging seed data for CrowdStack
-- This migration creates comprehensive test data: 100 attendees, venues, organizers, promoters, events, registrations, and check-ins

-- Ensure helper functions exist
CREATE OR REPLACE FUNCTION public.get_first_user()
RETURNS UUID AS $$
  SELECT id FROM auth.users ORDER BY created_at LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Create 5 Venues
INSERT INTO public.venues (id, name, address, city, state, country, phone, email, website, created_by)
VALUES 
  (gen_random_uuid(), 'Electric Nights', '450 Broadway', 'New York', 'NY', 'US', '+1-212-555-0101', 'info@electricnights.com', 'https://electricnights.com', public.get_first_user()),
  (gen_random_uuid(), 'The Underground', '789 Sunset Blvd', 'Los Angeles', 'CA', 'US', '+1-323-555-0202', 'booking@undergroundla.com', 'https://undergroundla.com', public.get_first_user()),
  (gen_random_uuid(), 'Skyline Rooftop', '1200 Market St', 'San Francisco', 'CA', 'US', '+1-415-555-0303', 'events@skyline.com', 'https://skyline.com', public.get_first_user()),
  (gen_random_uuid(), 'Midnight Social', '2056 N Halsted St', 'Chicago', 'IL', 'US', '+1-312-555-0404', 'hello@midnightsocial.com', 'https://midnightsocial.com', public.get_first_user()),
  (gen_random_uuid(), 'Bass Factory', '1234 NW 2nd Ave', 'Miami', 'FL', 'US', '+1-305-555-0505', 'contact@bassfactory.com', 'https://bassfactory.com', public.get_first_user())
ON CONFLICT DO NOTHING;

-- Create 5 Organizers
INSERT INTO public.organizers (id, name, email, phone, company_name, created_by)
VALUES 
  (gen_random_uuid(), 'Sarah Martinez', 'sarah@nightlifevents.com', '+1-555-1001', 'Nightlife Events Group', public.get_first_user()),
  (gen_random_uuid(), 'Marcus Chen', 'marcus@eliteproductions.com', '+1-555-1002', 'Elite Productions', public.get_first_user()),
  (gen_random_uuid(), 'Jessica Williams', 'jessica@partypulse.com', '+1-555-1003', 'Party Pulse Entertainment', public.get_first_user()),
  (gen_random_uuid(), 'David Rodriguez', 'david@vibeevents.com', '+1-555-1004', 'Vibe Events Co', public.get_first_user()),
  (gen_random_uuid(), 'Amanda Taylor', 'amanda@starlightevents.com', '+1-555-1005', 'Starlight Event Management', public.get_first_user())
ON CONFLICT DO NOTHING;

-- Create 20 Promoters
INSERT INTO public.promoters (id, name, email, phone, created_by)
VALUES 
  (gen_random_uuid(), 'Alex Johnson', 'alex.j@promo.com', '+1-555-2001', public.get_first_user()),
  (gen_random_uuid(), 'Jordan Smith', 'jordan.s@promo.com', '+1-555-2002', public.get_first_user()),
  (gen_random_uuid(), 'Taylor Davis', 'taylor.d@promo.com', '+1-555-2003', public.get_first_user()),
  (gen_random_uuid(), 'Morgan Brown', 'morgan.b@promo.com', '+1-555-2004', public.get_first_user()),
  (gen_random_uuid(), 'Casey Wilson', 'casey.w@promo.com', '+1-555-2005', public.get_first_user()),
  (gen_random_uuid(), 'Riley Moore', 'riley.m@promo.com', '+1-555-2006', public.get_first_user()),
  (gen_random_uuid(), 'Avery Lee', 'avery.l@promo.com', '+1-555-2007', public.get_first_user()),
  (gen_random_uuid(), 'Quinn Garcia', 'quinn.g@promo.com', '+1-555-2008', public.get_first_user()),
  (gen_random_uuid(), 'Blake Martinez', 'blake.m@promo.com', '+1-555-2009', public.get_first_user()),
  (gen_random_uuid(), 'Cameron Anderson', 'cameron.a@promo.com', '+1-555-2010', public.get_first_user()),
  (gen_random_uuid(), 'Drew Thomas', 'drew.t@promo.com', '+1-555-2011', public.get_first_user()),
  (gen_random_uuid(), 'Emery Jackson', 'emery.j@promo.com', '+1-555-2012', public.get_first_user()),
  (gen_random_uuid(), 'Finley White', 'finley.w@promo.com', '+1-555-2013', public.get_first_user()),
  (gen_random_uuid(), 'Hayden Harris', 'hayden.h@promo.com', '+1-555-2014', public.get_first_user()),
  (gen_random_uuid(), 'Jamie Martin', 'jamie.m@promo.com', '+1-555-2015', public.get_first_user()),
  (gen_random_uuid(), 'Kendall Thompson', 'kendall.t@promo.com', '+1-555-2016', public.get_first_user()),
  (gen_random_uuid(), 'Logan Young', 'logan.y@promo.com', '+1-555-2017', public.get_first_user()),
  (gen_random_uuid(), 'Parker Hall', 'parker.h@promo.com', '+1-555-2018', public.get_first_user()),
  (gen_random_uuid(), 'Reese Allen', 'reese.a@promo.com', '+1-555-2019', public.get_first_user()),
  (gen_random_uuid(), 'Sage King', 'sage.k@promo.com', '+1-555-2020', public.get_first_user())
ON CONFLICT DO NOTHING;

-- Create 100 Attendees with realistic names and contact info
INSERT INTO public.attendees (id, name, email, phone, created_at)
VALUES 
  (gen_random_uuid(), 'Emma Thompson', 'emma.thompson@email.com', '+1-555-3001', NOW() - INTERVAL '30 days'),
  (gen_random_uuid(), 'Liam Johnson', 'liam.j@email.com', '+1-555-3002', NOW() - INTERVAL '28 days'),
  (gen_random_uuid(), 'Olivia Brown', 'olivia.brown@email.com', '+1-555-3003', NOW() - INTERVAL '25 days'),
  (gen_random_uuid(), 'Noah Davis', 'noah.davis@email.com', '+1-555-3004', NOW() - INTERVAL '22 days'),
  (gen_random_uuid(), 'Ava Miller', 'ava.m@email.com', '+1-555-3005', NOW() - INTERVAL '20 days'),
  (gen_random_uuid(), 'Ethan Wilson', 'ethan.w@email.com', '+1-555-3006', NOW() - INTERVAL '18 days'),
  (gen_random_uuid(), 'Sophia Moore', 'sophia.m@email.com', '+1-555-3007', NOW() - INTERVAL '15 days'),
  (gen_random_uuid(), 'Mason Taylor', 'mason.t@email.com', '+1-555-3008', NOW() - INTERVAL '12 days'),
  (gen_random_uuid(), 'Isabella Anderson', 'isabella.a@email.com', '+1-555-3009', NOW() - INTERVAL '10 days'),
  (gen_random_uuid(), 'James Thomas', 'james.t@email.com', '+1-555-3010', NOW() - INTERVAL '8 days'),
  (gen_random_uuid(), 'Charlotte Jackson', 'charlotte.j@email.com', '+1-555-3011', NOW() - INTERVAL '7 days'),
  (gen_random_uuid(), 'Benjamin White', 'benjamin.w@email.com', '+1-555-3012', NOW() - INTERVAL '6 days'),
  (gen_random_uuid(), 'Mia Harris', 'mia.h@email.com', '+1-555-3013', NOW() - INTERVAL '5 days'),
  (gen_random_uuid(), 'Lucas Martin', 'lucas.m@email.com', '+1-555-3014', NOW() - INTERVAL '4 days'),
  (gen_random_uuid(), 'Amelia Thompson', 'amelia.t@email.com', '+1-555-3015', NOW() - INTERVAL '3 days'),
  (gen_random_uuid(), 'Henry Garcia', 'henry.g@email.com', '+1-555-3016', NOW() - INTERVAL '2 days'),
  (gen_random_uuid(), 'Harper Martinez', 'harper.m@email.com', '+1-555-3017', NOW() - INTERVAL '1 day'),
  (gen_random_uuid(), 'Alexander Robinson', 'alex.r@email.com', '+1-555-3018', NOW() - INTERVAL '1 day'),
  (gen_random_uuid(), 'Evelyn Clark', 'evelyn.c@email.com', '+1-555-3019', NOW()),
  (gen_random_uuid(), 'Michael Rodriguez', 'michael.r@email.com', '+1-555-3020', NOW()),
  (gen_random_uuid(), 'Abigail Lewis', 'abigail.l@email.com', '+1-555-3021', NOW()),
  (gen_random_uuid(), 'Daniel Walker', 'daniel.w@email.com', '+1-555-3022', NOW()),
  (gen_random_uuid(), 'Emily Hall', 'emily.h@email.com', '+1-555-3023', NOW()),
  (gen_random_uuid(), 'Matthew Allen', 'matthew.a@email.com', '+1-555-3024', NOW()),
  (gen_random_uuid(), 'Elizabeth Young', 'elizabeth.y@email.com', '+1-555-3025', NOW()),
  (gen_random_uuid(), 'Jackson Hernandez', 'jackson.h@email.com', '+1-555-3026', NOW()),
  (gen_random_uuid(), 'Sofia King', 'sofia.k@email.com', '+1-555-3027', NOW()),
  (gen_random_uuid(), 'David Wright', 'david.w@email.com', '+1-555-3028', NOW()),
  (gen_random_uuid(), 'Avery Lopez', 'avery.l@email.com', '+1-555-3029', NOW()),
  (gen_random_uuid(), 'Joseph Hill', 'joseph.h@email.com', '+1-555-3030', NOW()),
  (gen_random_uuid(), 'Madison Scott', 'madison.s@email.com', '+1-555-3031', NOW()),
  (gen_random_uuid(), 'Samuel Green', 'samuel.g@email.com', '+1-555-3032', NOW()),
  (gen_random_uuid(), 'Victoria Adams', 'victoria.a@email.com', '+1-555-3033', NOW()),
  (gen_random_uuid(), 'Sebastian Baker', 'sebastian.b@email.com', '+1-555-3034', NOW()),
  (gen_random_uuid(), 'Grace Gonzalez', 'grace.g@email.com', '+1-555-3035', NOW()),
  (gen_random_uuid(), 'Andrew Nelson', 'andrew.n@email.com', '+1-555-3036', NOW()),
  (gen_random_uuid(), 'Chloe Carter', 'chloe.c@email.com', '+1-555-3037', NOW()),
  (gen_random_uuid(), 'Joshua Mitchell', 'joshua.m@email.com', '+1-555-3038', NOW()),
  (gen_random_uuid(), 'Lily Perez', 'lily.p@email.com', '+1-555-3039', NOW()),
  (gen_random_uuid(), 'Christopher Roberts', 'chris.r@email.com', '+1-555-3040', NOW()),
  (gen_random_uuid(), 'Natalie Turner', 'natalie.t@email.com', '+1-555-3041', NOW()),
  (gen_random_uuid(), 'Ryan Phillips', 'ryan.p@email.com', '+1-555-3042', NOW()),
  (gen_random_uuid(), 'Hannah Campbell', 'hannah.c@email.com', '+1-555-3043', NOW()),
  (gen_random_uuid(), 'Nathan Parker', 'nathan.p@email.com', '+1-555-3044', NOW()),
  (gen_random_uuid(), 'Aria Evans', 'aria.e@email.com', '+1-555-3045', NOW()),
  (gen_random_uuid(), 'Jonathan Edwards', 'jonathan.e@email.com', '+1-555-3046', NOW()),
  (gen_random_uuid(), 'Layla Collins', 'layla.c@email.com', '+1-555-3047', NOW()),
  (gen_random_uuid(), 'Christian Stewart', 'christian.s@email.com', '+1-555-3048', NOW()),
  (gen_random_uuid(), 'Zoe Sanchez', 'zoe.s@email.com', '+1-555-3049', NOW()),
  (gen_random_uuid(), 'Dylan Morris', 'dylan.m@email.com', '+1-555-3050', NOW()),
  (gen_random_uuid(), 'Addison Rogers', 'addison.r@email.com', '+1-555-3051', NOW()),
  (gen_random_uuid(), 'Jaxon Reed', 'jaxon.r@email.com', '+1-555-3052', NOW()),
  (gen_random_uuid(), 'Aubrey Cook', 'aubrey.c@email.com', '+1-555-3053', NOW()),
  (gen_random_uuid(), 'Caleb Morgan', 'caleb.m@email.com', '+1-555-3054', NOW()),
  (gen_random_uuid(), 'Brooklyn Bell', 'brooklyn.b@email.com', '+1-555-3055', NOW()),
  (gen_random_uuid(), 'Isaac Murphy', 'isaac.m@email.com', '+1-555-3056', NOW()),
  (gen_random_uuid(), 'Leah Bailey', 'leah.b@email.com', '+1-555-3057', NOW()),
  (gen_random_uuid(), 'Julian Rivera', 'julian.r@email.com', '+1-555-3058', NOW()),
  (gen_random_uuid(), 'Savannah Cooper', 'savannah.c@email.com', '+1-555-3059', NOW()),
  (gen_random_uuid(), 'Aaron Richardson', 'aaron.r@email.com', '+1-555-3060', NOW()),
  (gen_random_uuid(), 'Claire Cox', 'claire.c@email.com', '+1-555-3061', NOW()),
  (gen_random_uuid(), 'Evan Howard', 'evan.h@email.com', '+1-555-3062', NOW()),
  (gen_random_uuid(), 'Skylar Ward', 'skylar.w@email.com', '+1-555-3063', NOW()),
  (gen_random_uuid(), 'Luke Torres', 'luke.t@email.com', '+1-555-3064', NOW()),
  (gen_random_uuid(), 'Lucy Peterson', 'lucy.p@email.com', '+1-555-3065', NOW()),
  (gen_random_uuid(), 'Connor Gray', 'connor.g@email.com', '+1-555-3066', NOW()),
  (gen_random_uuid(), 'Peyton Ramirez', 'peyton.r@email.com', '+1-555-3067', NOW()),
  (gen_random_uuid(), 'Levi James', 'levi.j@email.com', '+1-555-3068', NOW()),
  (gen_random_uuid(), 'Audrey Watson', 'audrey.w@email.com', '+1-555-3069', NOW()),
  (gen_random_uuid(), 'Jaxon Brooks', 'jaxon.b@email.com', '+1-555-3070', NOW()),
  (gen_random_uuid(), 'Bella Kelly', 'bella.k@email.com', '+1-555-3071', NOW()),
  (gen_random_uuid(), 'Kayden Sanders', 'kayden.s@email.com', '+1-555-3072', NOW()),
  (gen_random_uuid(), 'Nora Price', 'nora.p@email.com', '+1-555-3073', NOW()),
  (gen_random_uuid(), 'Dominic Bennett', 'dominic.b@email.com', '+1-555-3074', NOW()),
  (gen_random_uuid(), 'Riley Wood', 'riley.w@email.com', '+1-555-3075', NOW()),
  (gen_random_uuid(), 'Stella Barnes', 'stella.b@email.com', '+1-555-3076', NOW()),
  (gen_random_uuid(), 'Tristan Ross', 'tristan.r@email.com', '+1-555-3077', NOW()),
  (gen_random_uuid(), 'Aurora Henderson', 'aurora.h@email.com', '+1-555-3078', NOW()),
  (gen_random_uuid(), 'Grayson Coleman', 'grayson.c@email.com', '+1-555-3079', NOW()),
  (gen_random_uuid(), 'Ellie Jenkins', 'ellie.j@email.com', '+1-555-3080', NOW()),
  (gen_random_uuid(), 'Ian Perry', 'ian.p@email.com', '+1-555-3081', NOW()),
  (gen_random_uuid(), 'Naomi Powell', 'naomi.p@email.com', '+1-555-3082', NOW()),
  (gen_random_uuid(), 'Owen Long', 'owen.l@email.com', '+1-555-3083', NOW()),
  (gen_random_uuid(), 'Penelope Patterson', 'penelope.p@email.com', '+1-555-3084', NOW()),
  (gen_random_uuid(), 'Xavier Hughes', 'xavier.h@email.com', '+1-555-3085', NOW()),
  (gen_random_uuid(), 'Hailey Flores', 'hailey.f@email.com', '+1-555-3086', NOW()),
  (gen_random_uuid(), 'Wyatt Washington', 'wyatt.w@email.com', '+1-555-3087', NOW()),
  (gen_random_uuid(), 'Lillian Butler', 'lillian.b@email.com', '+1-555-3088', NOW()),
  (gen_random_uuid(), 'Carter Simmons', 'carter.s@email.com', '+1-555-3089', NOW()),
  (gen_random_uuid(), 'Natalia Foster', 'natalia.f@email.com', '+1-555-3090', NOW()),
  (gen_random_uuid(), 'Hunter Gonzales', 'hunter.g@email.com', '+1-555-3091', NOW()),
  (gen_random_uuid(), 'Ariana Bryant', 'ariana.b@email.com', '+1-555-3092', NOW()),
  (gen_random_uuid(), 'Eli Alexander', 'eli.a@email.com', '+1-555-3093', NOW()),
  (gen_random_uuid(), 'Violet Russell', 'violet.r@email.com', '+1-555-3094', NOW()),
  (gen_random_uuid(), 'Jordan Griffin', 'jordan.g@email.com', '+1-555-3095', NOW()),
  (gen_random_uuid(), 'Maya Diaz', 'maya.d@email.com', '+1-555-3096', NOW()),
  (gen_random_uuid(), 'Carson Hayes', 'carson.h@email.com', '+1-555-3097', NOW()),
  (gen_random_uuid(), 'Willow Myers', 'willow.m@email.com', '+1-555-3098', NOW()),
  (gen_random_uuid(), 'Adrian Ford', 'adrian.f@email.com', '+1-555-3099', NOW()),
  (gen_random_uuid(), 'Luna Hamilton', 'luna.h@email.com', '+1-555-3100', NOW())
ON CONFLICT DO NOTHING;

-- Create Events (using CTE to get venue and organizer IDs)
WITH venue_ids AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn FROM public.venues ORDER BY created_at LIMIT 5
),
organizer_ids AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn FROM public.organizers ORDER BY created_at LIMIT 5
),
event_data AS (
  SELECT 
    gen_random_uuid() as id,
    'summer-electro-fest-2024' as slug,
    'Summer Electro Fest 2024' as name,
    'The hottest electronic music festival of the summer' as description,
    (SELECT id FROM venue_ids WHERE rn = 1) as venue_id,
    (SELECT id FROM organizer_ids WHERE rn = 1) as organizer_id,
    (NOW() + INTERVAL '30 days')::timestamptz as start_time,
    (NOW() + INTERVAL '30 days' + INTERVAL '6 hours')::timestamptz as end_time,
    500 as capacity,
    'published' as status
  UNION ALL
  SELECT 
    gen_random_uuid(),
    'house-party-nyc',
    'House Party NYC',
    'Underground house music vibes every Friday',
    (SELECT id FROM venue_ids WHERE rn = 2),
    (SELECT id FROM organizer_ids WHERE rn = 2),
    (NOW() + INTERVAL '5 days')::timestamptz,
    (NOW() + INTERVAL '5 days' + INTERVAL '5 hours')::timestamptz,
    300,
    'published'
  UNION ALL
  SELECT 
    gen_random_uuid(),
    'rooftop-sunset-session',
    'Rooftop Sunset Session',
    'Sunset cocktails and beats',
    (SELECT id FROM venue_ids WHERE rn = 3),
    (SELECT id FROM organizer_ids WHERE rn = 3),
    (NOW() + INTERVAL '10 days')::timestamptz,
    (NOW() + INTERVAL '10 days' + INTERVAL '4 hours')::timestamptz,
    200,
    'published'
  UNION ALL
  SELECT 
    gen_random_uuid(),
    'bass-drop-chicago',
    'Bass Drop Chicago',
    'Heavy bass and dubstep night',
    (SELECT id FROM venue_ids WHERE rn = 4),
    (SELECT id FROM organizer_ids WHERE rn = 4),
    (NOW() + INTERVAL '15 days')::timestamptz,
    (NOW() + INTERVAL '15 days' + INTERVAL '6 hours')::timestamptz,
    400,
    'published'
  UNION ALL
  SELECT 
    gen_random_uuid(),
    'miami-beach-party',
    'Miami Beach Party',
    'Tropical vibes and house music',
    (SELECT id FROM venue_ids WHERE rn = 5),
    (SELECT id FROM organizer_ids WHERE rn = 5),
    (NOW() + INTERVAL '20 days')::timestamptz,
    (NOW() + INTERVAL '20 days' + INTERVAL '8 hours')::timestamptz,
    600,
    'published'
  UNION ALL
  SELECT 
    gen_random_uuid(),
    'techno-underground-la',
    'Techno Underground LA',
    'Dark warehouse techno experience',
    (SELECT id FROM venue_ids WHERE rn = 2),
    (SELECT id FROM organizer_ids WHERE rn = 1),
    (NOW() + INTERVAL '7 days')::timestamptz,
    (NOW() + INTERVAL '7 days' + INTERVAL '7 hours')::timestamptz,
    250,
    'published'
)
INSERT INTO public.events (id, slug, name, description, venue_id, organizer_id, start_time, end_time, capacity, status, promoter_access_type)
SELECT id, slug, name, description, venue_id, organizer_id, start_time, end_time, capacity, status, 'public'
FROM event_data
ON CONFLICT DO NOTHING;

-- Create Event-Promoter Links (assign multiple promoters to events)
WITH event_ids AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as event_rn FROM public.events ORDER BY created_at LIMIT 6
),
promoter_ids AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as promo_rn FROM public.promoters ORDER BY created_at LIMIT 20
)
INSERT INTO public.event_promoters (event_id, promoter_id, commission_type, commission_config)
SELECT 
  e.id,
  p.id,
  'flat_per_head',
  '{"amount_per_head": 5}'::jsonb
FROM event_ids e
CROSS JOIN LATERAL (
  SELECT id FROM promoter_ids 
  WHERE promo_rn BETWEEN (e.event_rn * 3 - 2) AND (e.event_rn * 3)
) p
ON CONFLICT DO NOTHING;

-- Create Registrations (attendees registering for events)
WITH attendee_ids AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as attendee_rn FROM public.attendees ORDER BY created_at LIMIT 100
),
event_ids AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as event_rn FROM public.events ORDER BY created_at LIMIT 6
),
promoter_ids AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as promo_rn FROM public.promoters ORDER BY created_at LIMIT 20
),
possible_registrations AS (
  SELECT 
    a.id as attendee_id,
    e.id as event_id,
    random() as rand1,
    random() as rand2,
    random() as rand3
  FROM attendee_ids a
  CROSS JOIN event_ids e
),
registration_data AS (
  SELECT 
    gen_random_uuid() as id,
    pr.attendee_id,
    pr.event_id,
    CASE 
      WHEN pr.rand2 < 0.4 THEN 
        (SELECT p.id FROM promoter_ids p ORDER BY p.promo_rn OFFSET (GREATEST(0, LEAST(19, floor(pr.rand2 * 20)::int))) LIMIT 1)
      ELSE NULL 
    END as promoter_id,
    (NOW() - INTERVAL '15 days' + (pr.rand3 * INTERVAL '14 days'))::timestamptz as registered_at
  FROM possible_registrations pr
  WHERE pr.rand1 < 0.3  -- Each attendee registers for ~30% of events on average
  LIMIT 250
)
INSERT INTO public.registrations (id, attendee_id, event_id, referral_promoter_id, registered_at)
SELECT id, attendee_id, event_id, promoter_id, registered_at
FROM registration_data
WHERE attendee_id IS NOT NULL AND event_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Create Check-ins (some registrations get checked in)
WITH registration_ids AS (
  SELECT r.id, r.event_id, r.registered_at
  FROM public.registrations r
  JOIN public.events e ON r.event_id = e.id
  WHERE e.start_time <= NOW() + INTERVAL '2 days'  -- Only check in for events that have happened or are soon
  ORDER BY random()
  LIMIT 150
),
checkin_data AS (
  SELECT 
    gen_random_uuid() as id,
    r.id as registration_id,
    public.get_first_user() as checked_in_by,
    (r.registered_at + INTERVAL '1 day' + (random() * INTERVAL '2 hours'))::timestamptz as checked_in_at
  FROM registration_ids r
)
INSERT INTO public.checkins (id, registration_id, checked_in_by, checked_in_at)
SELECT id, registration_id, checked_in_by, checked_in_at
FROM checkin_data
ON CONFLICT DO NOTHING;

-- Create some Guest Flags (flagged attendees at venues)
WITH venue_attendee_data AS (
  SELECT DISTINCT
    v.id as venue_id,
    a.id as attendee_id
  FROM public.venues v
  CROSS JOIN LATERAL (
    SELECT a.id 
    FROM public.registrations r
    JOIN public.events e ON r.event_id = e.id
    JOIN public.attendees a ON r.attendee_id = a.id
    WHERE e.venue_id = v.id
    ORDER BY random()
    LIMIT 5
  ) a
),
flag_data AS (
  SELECT 
    gen_random_uuid() as id,
    vad.venue_id,
    vad.attendee_id,
    CASE 
      WHEN random() < 0.3 THEN 'Inappropriate behavior'
      WHEN random() < 0.5 THEN 'No-show to multiple events'
      WHEN random() < 0.7 THEN 'Disruptive conduct'
      ELSE 'Policy violation'
    END as reason,
    CASE 
      WHEN random() < 0.2 THEN 3  -- Banned
      WHEN random() < 0.5 THEN 2  -- 2 strikes
      ELSE 1  -- 1 strike
    END as strike_count,
    CASE 
      WHEN random() < 0.2 THEN true  -- Permanent ban
      ELSE false
    END as permanent_ban,
    CASE 
      WHEN random() < 0.3 THEN (NOW() + INTERVAL '30 days')::timestamptz  -- Temporary ban
      ELSE NULL
    END as expires_at,
    public.get_first_user() as flagged_by,
    (NOW() - INTERVAL '5 days' + (random() * INTERVAL '10 days'))::timestamptz as created_at
  FROM venue_attendee_data vad
  LIMIT 20
)
INSERT INTO public.guest_flags (id, attendee_id, venue_id, reason, strike_count, permanent_ban, expires_at, flagged_by, created_at)
SELECT id, attendee_id, venue_id, reason, strike_count, permanent_ban, expires_at, flagged_by, created_at
FROM flag_data
ON CONFLICT (attendee_id, venue_id) DO UPDATE SET
  strike_count = EXCLUDED.strike_count,
  permanent_ban = EXCLUDED.permanent_ban,
  expires_at = EXCLUDED.expires_at;

