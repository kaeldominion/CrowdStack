-- Fix: Resolve ambiguous "level" column reference in calculate_level function
-- The function returns a column named "level" which conflicts with xp_levels.level
-- when querying inside the function without table qualification

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
  -- FIX: Use table alias xl to avoid ambiguity with function's return column
  IF v_current_level > 1 THEN
    SELECT xl.xp_required INTO v_prev_xp_required
    FROM xp_levels xl
    WHERE xl.level = v_current_level - 1;
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
  -- FIX: Use table alias xl to avoid ambiguity with function's return column
  SELECT xl.xp_required INTO v_next_xp_required
  FROM xp_levels xl
  WHERE xl.level = v_current_level + 1;

  -- Calculate progress from previous level threshold to next level threshold
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
