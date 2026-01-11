-- ============================================================================
-- DOKU Integration Test Data
-- Run this in Supabase SQL Editor to set up test venue, event, and table
-- ============================================================================

-- Get your user ID first (run this separately if needed):
-- SELECT id, email FROM auth.users LIMIT 5;

-- 1. Create test venue for DOKU testing
INSERT INTO venues (id, name, slug, currency, country, city)
VALUES (
  gen_random_uuid(),
  'Demo Club Bali',
  'demo-club-bali',
  'IDR',
  'Indonesia',
  'Bali'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  currency = EXCLUDED.currency;

-- Get the venue ID
DO $$
DECLARE
  v_venue_id UUID;
  v_zone_id UUID;
  v_table_id UUID;
  v_event_id UUID;
BEGIN
  -- Get venue ID
  SELECT id INTO v_venue_id FROM venues WHERE slug = 'demo-club-bali';

  -- 2. Create table zone
  INSERT INTO table_zones (id, venue_id, name)
  VALUES (gen_random_uuid(), v_venue_id, 'VIP Section')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_zone_id;

  -- If zone already exists, get its ID
  IF v_zone_id IS NULL THEN
    SELECT id INTO v_zone_id FROM table_zones WHERE venue_id = v_venue_id AND name = 'VIP Section';
  END IF;

  -- 3. Create test table with deposit requirement
  INSERT INTO venue_tables (id, venue_id, zone_id, name, capacity, minimum_spend, deposit_amount, is_active)
  VALUES (
    gen_random_uuid(),
    v_venue_id,
    v_zone_id,
    'VIP Table 1',
    10,
    5000000,    -- IDR 5,000,000 minimum spend
    1000000,    -- IDR 1,000,000 deposit (about $65 USD)
    true
  )
  ON CONFLICT DO NOTHING;

  -- 4. Create test event
  INSERT INTO events (id, name, slug, venue_id, status, start_time, currency, table_booking_mode, timezone)
  VALUES (
    gen_random_uuid(),
    'Saturday Night Party',
    'saturday-night-party-test',
    v_venue_id,
    'published',
    NOW() + INTERVAL '7 days',
    'IDR',
    'direct',  -- Allow direct table booking
    'Asia/Jakarta'
  )
  ON CONFLICT (slug) DO UPDATE SET
    status = 'published',
    table_booking_mode = 'direct';

  -- Output the venue ID for configuring DOKU credentials
  RAISE NOTICE 'Test venue created with ID: %', v_venue_id;
  RAISE NOTICE 'Visit /admin/venues to configure DOKU credentials';
  RAISE NOTICE 'Then visit /e/saturday-night-party-test to test booking';
END $$;

-- Show the created venue ID (you'll need this)
SELECT id, name, slug FROM venues WHERE slug = 'demo-club-bali';
