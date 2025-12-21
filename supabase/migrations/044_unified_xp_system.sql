-- Unified XP System Migration
-- Implements one global XP ledger with role-weighted sources and role-specific unlocks

-- ============================================
-- 1. CREATE XP SOURCE TYPE ENUM
-- ============================================

CREATE TYPE xp_source_type AS ENUM (
  -- Attendee sources
  'ATTENDED_EVENT',
  'EARLY_REGISTRATION',
  'REPEAT_VENUE_ATTENDANCE',
  'PROFILE_COMPLETION',
  'SOCIAL_CONNECTION',
  'PHOTO_TAGGED', -- future
  'TABLE_SPEND', -- future
  'NO_SHOW_PENALTY',
  
  -- Promoter sources
  'PROMOTER_REFERRAL_REGISTRATION',
  'PROMOTER_REFERRAL_CHECKIN',
  'PROMOTER_CONVERSION_BONUS',
  'PROMOTER_RELIABILITY_BONUS',
  'PROMOTER_QUALITY_BONUS',
  'PROMOTER_DISPUTE_PENALTY',
  
  -- Organizer sources
  'ORGANIZER_EVENT_COMPLETED',
  'ORGANIZER_ATTENDANCE_ACCURACY',
  'ORGANIZER_PAYOUT_ON_TIME',
  'ORGANIZER_VENUE_SATISFACTION',
  'ORGANIZER_PROMOTER_RETENTION',
  
  -- Venue sources (future)
  'VENUE_EVENT_SUCCESS',
  'VENUE_FAIR_PAYOUT',
  'VENUE_REPEAT_ORGANIZERS'
);

-- ============================================
-- 2. UPDATE XP_LEDGER TABLE TO UNIFIED MODEL
-- ============================================

-- First, we need to handle existing data if any exists
-- For existing rows, we'll need to derive user_id from attendee_id
DO $$
BEGIN
  -- If there are existing rows, migrate them first
  IF EXISTS (SELECT 1 FROM public.xp_ledger LIMIT 1) THEN
    -- Add user_id column first (nullable temporarily)
    ALTER TABLE public.xp_ledger 
      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    
    -- Migrate existing data: get user_id from attendee
    UPDATE public.xp_ledger xl
    SET user_id = a.user_id
    FROM public.attendees a
    WHERE xl.attendee_id = a.id
    AND a.user_id IS NOT NULL;
    
    -- Delete rows where we couldn't find a user_id (orphaned data)
    DELETE FROM public.xp_ledger
    WHERE user_id IS NULL;
  END IF;
END $$;

-- Drop old constraint and columns
ALTER TABLE public.xp_ledger 
  DROP CONSTRAINT IF EXISTS xp_ledger_attendee_id_fkey;

-- Add new columns
ALTER TABLE public.xp_ledger 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS source_type xp_source_type,
  ADD COLUMN IF NOT EXISTS role_context TEXT CHECK (role_context IN ('attendee', 'promoter', 'organizer', 'venue')),
  ADD COLUMN IF NOT EXISTS related_id UUID, -- nullable, generic FK for related entity
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Rename reason to description if reason column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'xp_ledger' 
             AND column_name = 'reason') THEN
    ALTER TABLE public.xp_ledger RENAME COLUMN reason TO description;
  END IF;
END $$;

-- Make new columns NOT NULL after migration (if no existing data)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.xp_ledger LIMIT 1) THEN
    ALTER TABLE public.xp_ledger 
      ALTER COLUMN user_id SET NOT NULL,
      ALTER COLUMN source_type SET NOT NULL,
      ALTER COLUMN role_context SET NOT NULL;
  END IF;
END $$;

-- Drop attendee_id column if it exists and we've migrated
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'xp_ledger' 
             AND column_name = 'attendee_id') THEN
    ALTER TABLE public.xp_ledger DROP COLUMN attendee_id;
  END IF;
END $$;

-- Update indexes
DROP INDEX IF EXISTS idx_xp_ledger_attendee_id;
CREATE INDEX IF NOT EXISTS idx_xp_ledger_user_id ON public.xp_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_ledger_role_context ON public.xp_ledger(role_context);
CREATE INDEX IF NOT EXISTS idx_xp_ledger_source_type ON public.xp_ledger(source_type);

-- ============================================
-- 3. USER XP SUMMARY (MATERIALIZED VIEW)
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS user_xp_summary AS
SELECT 
  user_id,
  SUM(amount) as total_xp,
  COUNT(*) as xp_events_count,
  MIN(created_at) as first_xp_at,
  MAX(created_at) as last_xp_at,
  jsonb_object_agg(role_context, role_xp) FILTER (WHERE role_context IS NOT NULL) as xp_by_role
FROM (
  SELECT 
    user_id,
    role_context,
    SUM(amount) as role_xp,
    MIN(created_at) as first_xp_at,
    MAX(created_at) as last_xp_at
  FROM xp_ledger
  WHERE user_id IS NOT NULL
  GROUP BY user_id, role_context
) role_totals
GROUP BY user_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_xp_summary_user_id ON user_xp_summary(user_id);

-- ============================================
-- 4. BADGES SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT,
  badge_category TEXT NOT NULL CHECK (badge_category IN ('performance', 'reliability', 'quality', 'milestone', 'special')),
  target_role TEXT NOT NULL CHECK (target_role IN ('attendee', 'promoter', 'organizer', 'venue', 'all')),
  criteria_jsonb JSONB, -- For automatic badges: {"type": "checkin_count", "threshold": 10}
  is_automatic BOOLEAN DEFAULT false,
  is_giftable BOOLEAN DEFAULT true, -- Can organizers/venues gift this?
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  awarded_by UUID REFERENCES auth.users(id), -- NULL for automatic
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);

-- ============================================
-- 5. LEVELS SYSTEM (50 EXPONENTIAL LEVELS)
-- ============================================

CREATE TABLE IF NOT EXISTS xp_levels (
  level INTEGER PRIMARY KEY CHECK (level BETWEEN 1 AND 50),
  xp_required INTEGER NOT NULL,
  level_name TEXT NOT NULL,
  attendee_benefits JSONB DEFAULT '[]'::jsonb,
  promoter_benefits JSONB DEFAULT '[]'::jsonb,
  organizer_benefits JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function: Calculate level from total XP
CREATE OR REPLACE FUNCTION calculate_level(total_xp INTEGER)
RETURNS TABLE (
  level INTEGER,
  xp_in_level INTEGER,
  xp_for_next_level INTEGER,
  progress_pct NUMERIC
) AS $$
DECLARE
  v_current_level INTEGER;
  v_current_xp_required INTEGER;
  v_prev_xp_required INTEGER;
  v_next_xp_required INTEGER;
BEGIN
  -- Find the highest level where xp_required <= total_xp
  SELECT xl.level, xl.xp_required INTO v_current_level, v_current_xp_required
  FROM xp_levels xl
  WHERE xl.xp_required <= total_xp
  ORDER BY xl.level DESC
  LIMIT 1;
  
  -- If no level found, return level 0
  IF v_current_level IS NULL THEN
    RETURN QUERY SELECT 0::INTEGER, total_xp, 100, 0::NUMERIC;
    RETURN;
  END IF;
  
  -- Get previous level's XP requirement
  SELECT xp_required INTO v_prev_xp_required
  FROM xp_levels
  WHERE level = v_current_level - 1;
  
  -- If at max level
  IF v_current_level = 50 THEN
    RETURN QUERY SELECT 
      v_current_level,
      total_xp - COALESCE(v_prev_xp_required, 0),
      0,
      100.0::NUMERIC;
    RETURN;
  END IF;
  
  -- Get next level's XP requirement
  SELECT xp_required INTO v_next_xp_required
  FROM xp_levels
  WHERE level = v_current_level + 1;
  
  RETURN QUERY SELECT 
    v_current_level,
    total_xp - COALESCE(v_prev_xp_required, 0),
    GREATEST(0, v_next_xp_required - total_xp),
    CASE 
      WHEN v_next_xp_required = v_current_xp_required THEN 100.0
      ELSE LEAST(100.0, GREATEST(0.0, 
        (total_xp::NUMERIC - COALESCE(v_prev_xp_required, 0)) / 
        NULLIF(v_next_xp_required - COALESCE(v_prev_xp_required, 0), 0) * 100.0))
    END;
END;
$$ LANGUAGE plpgsql STABLE;

-- Seed XP levels with exponential curve
-- Formula: XP_required = 100 * (1.15 ^ (level - 1))
INSERT INTO xp_levels (level, xp_required, level_name, attendee_benefits, promoter_benefits, organizer_benefits)
SELECT 
  level,
  ROUND(100 * POWER(1.15, level - 1))::INTEGER as xp_required,
  CASE 
    WHEN level BETWEEN 1 AND 10 THEN 'Bronze ' || level
    WHEN level BETWEEN 11 AND 25 THEN 'Silver ' || level
    WHEN level BETWEEN 26 AND 40 THEN 'Gold ' || level
    ELSE 'Platinum ' || level
  END as level_name,
  '[]'::jsonb as attendee_benefits,
  '[]'::jsonb as promoter_benefits,
  '[]'::jsonb as organizer_benefits
FROM generate_series(1, 50) as level
ON CONFLICT (level) DO NOTHING;

