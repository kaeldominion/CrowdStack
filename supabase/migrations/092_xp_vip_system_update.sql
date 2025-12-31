-- XP and VIP System Update Migration
-- Updates XP levels to 10 levels with exponential curve
-- Adds auto-VIP trigger for level 6+ (10,000 XP)

-- ============================================
-- 1. UPDATE XP_LEVELS TABLE TO 10 LEVELS
-- ============================================

-- Create xp_levels table if it doesn't exist
CREATE TABLE IF NOT EXISTS xp_levels (
  level INTEGER PRIMARY KEY CHECK (level BETWEEN 1 AND 10),
  xp_required INTEGER NOT NULL,
  level_name TEXT NOT NULL,
  attendee_benefits JSONB DEFAULT '[]'::jsonb,
  promoter_benefits JSONB DEFAULT '[]'::jsonb,
  organizer_benefits JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Delete all existing levels (we'll recreate with new values)
DELETE FROM xp_levels;

-- Update the constraint to only allow levels 1-10
ALTER TABLE xp_levels DROP CONSTRAINT IF EXISTS xp_levels_level_check;
ALTER TABLE xp_levels ADD CONSTRAINT xp_levels_level_check CHECK (level BETWEEN 1 AND 10);

-- Insert new 10-level progression with exponential curve
-- Level 6 = 10,000 XP (Global VIP threshold)
INSERT INTO xp_levels (level, xp_required, level_name, attendee_benefits, promoter_benefits, organizer_benefits)
VALUES
  (1, 100, 'Bronze I', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb),
  (2, 250, 'Bronze II', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb),
  (3, 500, 'Bronze III', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb),
  (4, 1000, 'Silver I', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb),
  (5, 2500, 'Silver II', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb),
  (6, 10000, 'Gold I', '["Global VIP Status"]'::jsonb, '[]'::jsonb, '[]'::jsonb),
  (7, 20000, 'Gold II', '["Global VIP Status"]'::jsonb, '[]'::jsonb, '[]'::jsonb),
  (8, 35000, 'Platinum I', '["Global VIP Status"]'::jsonb, '[]'::jsonb, '[]'::jsonb),
  (9, 50000, 'Platinum II', '["Global VIP Status"]'::jsonb, '[]'::jsonb, '[]'::jsonb),
  (10, 100000, 'Diamond', '["Global VIP Status"]'::jsonb, '[]'::jsonb, '[]'::jsonb)
ON CONFLICT (level) DO UPDATE SET
  xp_required = EXCLUDED.xp_required,
  level_name = EXCLUDED.level_name,
  attendee_benefits = EXCLUDED.attendee_benefits;

-- ============================================
-- 2. UPDATE calculate_level() FUNCTION
-- ============================================

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
  
  -- Get previous level's XP requirement (or 0 if level 1)
  IF v_current_level > 1 THEN
    SELECT xp_required INTO v_prev_xp_required
    FROM xp_levels
    WHERE level = v_current_level - 1;
  ELSE
    v_prev_xp_required := 0;
  END IF;
  
  -- If at max level (10)
  IF v_current_level = 10 THEN
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
  
  -- Calculate progress from previous level threshold to next level threshold
  -- This gives meaningful progress: if you have 100 XP and next level is 200, you're at 50%
  RETURN QUERY SELECT 
    v_current_level,
    total_xp - COALESCE(v_prev_xp_required, 0),
    GREATEST(0, v_next_xp_required - total_xp),
    CASE 
      WHEN v_next_xp_required = COALESCE(v_prev_xp_required, 0) THEN 100.0
      ELSE LEAST(100.0, GREATEST(0.0, 
        (total_xp::NUMERIC - COALESCE(v_prev_xp_required, 0)) / 
        NULLIF(v_next_xp_required - COALESCE(v_prev_xp_required, 0), 0) * 100.0))
    END;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 3. AUTO-VIP TRIGGER FUNCTION
-- ============================================

-- Function to check and grant global VIP when user reaches level 6
-- Create trigger function - only works with new schema (user_id column)
-- If old schema exists, trigger won't be created (see trigger creation below)
CREATE OR REPLACE FUNCTION auto_grant_global_vip()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_attendee_id UUID;
  v_total_xp INTEGER;
  v_current_level INTEGER;
  v_level_6_xp INTEGER;
BEGIN
  -- Get user_id from the XP ledger entry (new schema only)
  v_user_id := NEW.user_id;
  
  -- If no user_id found, skip
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get attendee_id for this user
  SELECT id INTO v_attendee_id
  FROM attendees
  WHERE user_id = v_user_id
  LIMIT 1;
  
  -- If no attendee record, skip
  IF v_attendee_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Calculate total XP for this user
  SELECT COALESCE(SUM(amount), 0) INTO v_total_xp
  FROM xp_ledger
  WHERE user_id = v_user_id;
  
  -- Get level 6 XP requirement
  SELECT xp_required INTO v_level_6_xp
  FROM xp_levels
  WHERE level = 6;
  
  -- Check if user has reached level 6 (10,000 XP)
  IF v_total_xp >= v_level_6_xp THEN
    -- Get current level to verify
    SELECT level INTO v_current_level
    FROM calculate_level(v_total_xp)
    LIMIT 1;
    
    -- Only grant if level 6 or higher and not already VIP
    IF v_current_level >= 6 THEN
      UPDATE public.attendees
      SET 
        is_global_vip = true,
        global_vip_reason = 'Level ' || v_current_level || ' Achievement',
        global_vip_granted_at = COALESCE(global_vip_granted_at, NOW())
      WHERE id = v_attendee_id
      AND is_global_vip = false;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. CREATE TRIGGER ON XP_LEDGER
-- ============================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS xp_ledger_auto_vip_trigger ON xp_ledger;

-- Create trigger to auto-grant VIP after XP is awarded
-- Only create if xp_ledger has user_id column (new schema)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'xp_ledger' 
    AND column_name = 'user_id'
  ) THEN
    EXECUTE 'CREATE TRIGGER xp_ledger_auto_vip_trigger
      AFTER INSERT ON xp_ledger
      FOR EACH ROW
      EXECUTE FUNCTION auto_grant_global_vip()';
  END IF;
END $$;

-- ============================================
-- 5. GRANT VIP TO EXISTING LEVEL 6+ USERS
-- ============================================

-- Backfill: Grant global VIP to any existing users who already have 10,000+ XP
DO $$                                                                          
DECLARE                                                                        
  v_attendee_record RECORD;                                                    
  v_user_xp INTEGER;                                                           
  v_level_6_xp INTEGER;
  v_has_user_id_column BOOLEAN;
BEGIN                                                                          
  -- Get level 6 XP requirement                                                
  SELECT xp_required INTO v_level_6_xp                                         
  FROM xp_levels                                                               
  WHERE level = 6;                                                             
  
  -- Check if xp_ledger has user_id column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'xp_ledger' 
    AND column_name = 'user_id'
  ) INTO v_has_user_id_column;
                                                                               
  -- Loop through all attendees with user accounts                             
  FOR v_attendee_record IN                                                     
    SELECT a.id, a.user_id, a.is_global_vip                                    
    FROM attendees a                                                           
    WHERE a.user_id IS NOT NULL                                                
    AND a.is_global_vip = false                                                
  LOOP                                                                         
    -- Calculate total XP for this user
    -- Handle both old schema (attendee_id) and new schema (user_id)
    IF v_has_user_id_column THEN
      SELECT COALESCE(SUM(amount), 0) INTO v_user_xp                             
      FROM xp_ledger                                                             
      WHERE user_id = v_attendee_record.user_id;
    ELSE
      -- Old schema: use attendee_id and join to get user_id
      SELECT COALESCE(SUM(xl.amount), 0) INTO v_user_xp
      FROM xp_ledger xl
      INNER JOIN attendees a2 ON xl.attendee_id = a2.id
      WHERE a2.user_id = v_attendee_record.user_id;
    END IF;
                                                                               
    -- If they have 10,000+ XP, grant VIP                                      
    IF v_user_xp >= v_level_6_xp THEN                                          
      UPDATE attendees                                                         
      SET                                                                      
        is_global_vip = true,                                                  
        global_vip_reason = 'Level 6+ Achievement (Backfilled)',               
        global_vip_granted_at = NOW()                                          
      WHERE id = v_attendee_record.id;                                         
    END IF;                                                                    
  END LOOP;                                                                    
END $$;

COMMENT ON FUNCTION auto_grant_global_vip() IS 'Automatically grants global VIP status when a user reaches level 6 (10,000 XP)';

