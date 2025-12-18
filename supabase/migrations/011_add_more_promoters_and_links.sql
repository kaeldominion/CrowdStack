-- Add more promoters and link them to organizers/events
-- This migration adds additional promoters and creates event_promoter relationships

-- Add 10 more promoters with diverse names
INSERT INTO public.promoters (id, name, email, phone, created_by)
SELECT 
  gen_random_uuid(),
  names.name,
  LOWER(REPLACE(names.name, ' ', '.')) || '@promoters.com',
  '+1-555-' || LPAD((3000 + row_number() OVER ())::text, 4, '0'),
  public.get_first_user()
FROM (
  VALUES
    ('Nova Rivera'),
    ('Phoenix Stone'),
    ('River Brooks'),
    ('Skylar Moon'),
    ('Aspen Reed'),
    ('Indigo Cross'),
    ('Ocean Fields'),
    ('Luna Woods'),
    ('Storm Knight'),
    ('Zenith Vale')
) AS names(name)
ON CONFLICT DO NOTHING;

-- Link promoters to events (assign 3-4 promoters per event)
-- Simple sequential assignment: Event 1 gets promoters 1-3, Event 2 gets 4-6, etc.
WITH numbered_events AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as event_num
  FROM public.events
),
numbered_promoters AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as promo_num
  FROM public.promoters
),
promoter_count AS (
  SELECT COUNT(*)::int as total FROM numbered_promoters
),
-- For each event, assign the next 3-4 promoters
event_promoter_assignments AS (
  SELECT 
    e.id as event_id,
    p.id as promoter_id,
    -- Alternate commission types
    CASE 
      WHEN (e.event_num + p.promo_num) % 2 = 0 THEN 'flat_per_head'
      ELSE 'tiered_thresholds'
    END as commission_type,
    CASE 
      WHEN (e.event_num + p.promo_num) % 2 = 0 THEN 
        jsonb_build_object('amount_per_head', ((e.event_num + p.promo_num) % 20) + 5)
      ELSE 
        jsonb_build_object(
          'tiers', jsonb_build_array(
            jsonb_build_object('threshold', 10, 'amount_per_head', 5),
            jsonb_build_object('threshold', 25, 'amount_per_head', 7),
            jsonb_build_object('threshold', 50, 'amount_per_head', 10)
          )
        )
    END as commission_config
  FROM numbered_events e
  CROSS JOIN numbered_promoters p
  CROSS JOIN promoter_count pc
  -- Event N (1-indexed) gets promoters starting at position (N-1)*4 + 1, up to 3-4 promoters
  -- Use modulo to wrap around if we have more events than promoters
  WHERE MOD(p.promo_num - 1 + (e.event_num - 1) * 4, pc.total) < 4
)
INSERT INTO public.event_promoters (event_id, promoter_id, commission_type, commission_config)
SELECT DISTINCT
  event_id,
  promoter_id,
  commission_type,
  commission_config
FROM event_promoter_assignments
ON CONFLICT (event_id, promoter_id) DO NOTHING;

-- Verify the data was added
DO $$
DECLARE
  promoter_count INTEGER;
  event_promoter_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO promoter_count FROM public.promoters;
  SELECT COUNT(*) INTO event_promoter_count FROM public.event_promoters;
  
  RAISE NOTICE 'Total promoters: %', promoter_count;
  RAISE NOTICE 'Total event-promoter relationships: %', event_promoter_count;
END $$;
